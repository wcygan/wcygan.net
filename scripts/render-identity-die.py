"""Render the homepage Projects die as a transparent, seamless 3D loop.

Run with Blender, not the system Python:

    blender --background --python scripts/render-identity-die.py -- \
      --output-dir /tmp/identity-die-frames

The orientation combines equal-rate rotations around two orthogonal axes. The
resulting angular-velocity vector changes direction continuously while its
magnitude remains constant.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


FRAME_COUNT = 600
FRAME_RATE = 120
RESOLUTION = 560
CUBE_SIZE = 3.0
CUBE_HALF = CUBE_SIZE / 2
DECAL_OFFSET = CUBE_HALF + 0.025
CAMERA_LOCATION = Vector((-6.0, -8.0, 6.0))


def parse_args() -> argparse.Namespace:
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=FRAME_COUNT)
    parser.add_argument("--fps", type=int, default=FRAME_RATE)
    parser.add_argument("--resolution", type=int, default=RESOLUTION)
    parser.add_argument(
        "--render-frames",
        help="Comma-separated zero-based frames. Omit to render the full loop.",
    )
    parser.add_argument("--save-blend", type=Path)
    return parser.parse_args(script_args)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float = 0.34,
    metallic: float = 0.0,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    emission_input = principled.inputs.get("Emission Color") or principled.inputs.get(
        "Emission"
    )
    if emission_input and emission_strength > 0:
        emission_input.default_value = color
        principled.inputs["Emission Strength"].default_value = emission_strength
    return material


def parent_to_root(obj: bpy.types.Object, root: bpy.types.Object) -> bpy.types.Object:
    obj.parent = root
    return obj


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    root: bpy.types.Object,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return parent_to_root(obj, root)


def add_pip(
    name: str,
    location: tuple[float, float, float],
    normal: tuple[float, float, float],
    material: bpy.types.Material,
    root: bpy.types.Object,
) -> bpy.types.Object:
    normal_vector = Vector(normal).normalized()
    rotation = Vector((0, 0, 1)).rotation_difference(normal_vector)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=16,
        radius=0.18,
        location=location,
        rotation=rotation.to_euler(),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = (1.0, 1.0, 0.12)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return parent_to_root(obj, root)


def add_extruded_polygon(
    name: str,
    points: list[tuple[float, float]],
    location: tuple[float, float, float],
    normal: tuple[float, float, float],
    material: bpy.types.Material,
    root: bpy.types.Object,
    *,
    depth: float = 0.05,
) -> bpy.types.Object:
    half_depth = depth / 2
    vertex_count = len(points)
    vertices = [(x, y, -half_depth) for x, y in points] + [
        (x, y, half_depth) for x, y in points
    ]
    faces: list[tuple[int, ...]] = [
        tuple(range(vertex_count - 1, -1, -1)),
        tuple(range(vertex_count, vertex_count * 2)),
    ]
    for index in range(vertex_count):
        next_index = (index + 1) % vertex_count
        faces.append(
            (
                index,
                next_index,
                vertex_count + next_index,
                vertex_count + index,
            )
        )

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(
        Vector(normal).normalized()
    )
    obj.data.materials.append(material)
    return parent_to_root(obj, root)


def create_die() -> tuple[bpy.types.Object, dict[str, Vector]]:
    root = bpy.data.objects.new("IdentityDieRoot", None)
    bpy.context.collection.objects.link(root)
    root.rotation_mode = "QUATERNION"

    body = make_material("DieBody", (0.008, 0.016, 0.035, 1.0), roughness=0.27)
    coral = make_material(
        "CoralMark",
        (0.92, 0.28, 0.06, 1.0),
        roughness=0.40,
        emission_strength=0.55,
    )
    violet = make_material(
        "VioletMark",
        (0.45, 0.16, 0.90, 1.0),
        roughness=0.40,
        emission_strength=0.55,
    )
    blue = make_material(
        "BlueMark",
        (0.20, 0.48, 0.82, 1.0),
        roughness=0.38,
        emission_strength=0.55,
    )
    pink = make_material(
        "PinkMark",
        (0.90, 0.34, 0.64, 1.0),
        roughness=0.38,
        emission_strength=0.55,
    )
    yellow = make_material(
        "YellowMark",
        (0.92, 0.66, 0.08, 1.0),
        roughness=0.40,
        emission_strength=0.55,
    )
    green = make_material(
        "GreenMark",
        (0.24, 0.69, 0.50, 1.0),
        roughness=0.40,
        emission_strength=0.55,
    )

    bpy.ops.mesh.primitive_cube_add(size=CUBE_SIZE)
    cube = bpy.context.object
    cube.name = "RoundedDieBody"
    cube.data.materials.append(body)
    bevel = cube.modifiers.new("RoundedEdges", "BEVEL")
    bevel.width = 0.22
    bevel.segments = 8
    bevel.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = cube
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for polygon in cube.data.polygons:
        polygon.use_smooth = True
    parent_to_root(cube, root)

    # Front (-Y): four coral pips.
    for index, (x, z) in enumerate(((-0.44, 0.44), (0.44, 0.44), (-0.44, -0.44), (0.44, -0.44))):
        add_pip(
            f"FrontPip{index + 1}",
            (x, -DECAL_OFFSET, z),
            (0, -1, 0),
            coral,
            root,
        )

    # Left (-X): three blue bars.
    for index, z in enumerate((0.42, 0.0, -0.42)):
        add_box(
            f"BlueBar{index + 1}",
            (0.05, 0.82, 0.17),
            (-DECAL_OFFSET, 0, z),
            blue,
            root,
        )

    # Back (+Y): yellow plus.
    add_box("PlusHorizontal", (0.92, 0.05, 0.20), (0, DECAL_OFFSET, 0), yellow, root)
    add_box("PlusVertical", (0.20, 0.05, 0.92), (0, DECAL_OFFSET, 0), yellow, root)

    # Right (+X): green diamond.
    diamond = [(0, 0.58), (0.48, 0), (0, -0.58), (-0.48, 0)]
    add_extruded_polygon(
        "GreenDiamond",
        diamond,
        (DECAL_OFFSET, 0, 0),
        (1, 0, 0),
        green,
        root,
    )

    # Top (+Z): pink four-point star.
    star: list[tuple[float, float]] = []
    for index in range(8):
        angle = math.pi / 2 + index * math.pi / 4
        radius = 0.68 if index % 2 == 0 else 0.22
        star.append((math.cos(angle) * radius, math.sin(angle) * radius))
    add_extruded_polygon(
        "PinkStar",
        star,
        (0, 0, DECAL_OFFSET),
        (0, 0, 1),
        pink,
        root,
    )

    # Bottom (-Z): six violet pips make the hidden face unmistakable.
    for index, (x, y) in enumerate(
        (
            (-0.42, -0.52),
            (-0.42, 0),
            (-0.42, 0.52),
            (0.42, -0.52),
            (0.42, 0),
            (0.42, 0.52),
        )
    ):
        add_pip(
            f"BottomPip{index + 1}",
            (x, y, -DECAL_OFFSET),
            (0, 0, -1),
            violet,
            root,
        )

    face_normals = {
        "front-coral-four": Vector((0, -1, 0)),
        "left-bars": Vector((-1, 0, 0)),
        "back-plus": Vector((0, 1, 0)),
        "right-diamond": Vector((1, 0, 0)),
        "top-star": Vector((0, 0, 1)),
        "bottom-violet-six": Vector((0, 0, -1)),
    }
    return root, face_normals


def raw_orientation(progress: float) -> Quaternion:
    full_turn = math.tau * progress
    return (
        Quaternion((0, 0, 1), full_turn)
        @ Quaternion((1, 0, 0), full_turn)
    ).normalized()


def quaternion_distance(first: Quaternion, second: Quaternion) -> float:
    dot = min(1.0, max(-1.0, abs(first.dot(second))))
    return 2 * math.acos(dot)


def constant_speed_orientations(frame_count: int) -> list[Quaternion]:
    return [raw_orientation(frame / frame_count) for frame in range(frame_count)]


def add_area_light(
    name: str,
    location: tuple[float, float, float],
    energy: float,
    size: float,
    color: tuple[float, float, float],
) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (-Vector(location)).to_track_quat("-Z", "Y").to_euler()


def configure_scene(resolution: int, fps: int) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.fps = fps
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    scene.render.image_settings.compression = 20

    scene.world.color = (0.018, 0.022, 0.032)
    world_background = scene.world.node_tree.nodes.get("Background") if scene.world.use_nodes else None
    if world_background:
        world_background.inputs["Color"].default_value = (0.018, 0.022, 0.032, 1)
        world_background.inputs["Strength"].default_value = 0.22

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    camera_data = bpy.data.cameras.new("IdentityDieCamera")
    camera = bpy.data.objects.new("IdentityDieCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = CAMERA_LOCATION
    camera.rotation_euler = (-CAMERA_LOCATION).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 12.5
    camera.data.shift_x = 0.10
    camera.data.shift_y = -0.13
    scene.camera = camera

    add_area_light("Key", (-4.0, -5.0, 8.5), 920, 4.5, (1.0, 0.95, 0.90))
    add_area_light("Fill", (5.0, -3.0, 3.5), 580, 5.0, (0.74, 0.84, 1.0))
    add_area_light("Rim", (2.0, 5.0, 6.0), 760, 3.8, (0.95, 0.76, 0.91))
    return camera


def report_motion(
    orientations: list[Quaternion],
    face_normals: dict[str, Vector],
    fps: int,
) -> None:
    duration = len(orientations) / fps
    angular_speed = math.sqrt(2) * math.tau / duration
    loop_closure = quaternion_distance(raw_orientation(0), raw_orientation(1))
    print(
        "Analytic angular speed: "
        f"{angular_speed:.8f} radians/second (constant magnitude)"
    )
    print(f"Loop closure error: {loop_closure:.8f} radians")

    view_direction = CAMERA_LOCATION.normalized()
    for name, normal in face_normals.items():
        max_facing = max((orientation @ normal).dot(view_direction) for orientation in orientations)
        print(f"Face coverage {name}: {max_facing:.6f}")


def keyframe_orientations(
    root: bpy.types.Object,
    orientations: list[Quaternion],
) -> None:
    for index, orientation in enumerate(orientations, start=1):
        root.rotation_quaternion = orientation
        root.keyframe_insert(data_path="rotation_quaternion", frame=index)


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    clear_scene()
    root, face_normals = create_die()
    configure_scene(args.resolution, args.fps)
    orientations = constant_speed_orientations(args.frames)
    report_motion(orientations, face_normals, args.fps)
    keyframe_orientations(root, orientations)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = args.frames
    if args.save_blend:
        args.save_blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(args.save_blend))

    render_frames = (
        [int(value) for value in args.render_frames.split(",")]
        if args.render_frames
        else list(range(args.frames))
    )
    for zero_based_frame in render_frames:
        if zero_based_frame < 0 or zero_based_frame >= args.frames:
            raise ValueError(f"Frame {zero_based_frame} is outside the loop")
        scene.frame_set(zero_based_frame + 1)
        scene.render.filepath = str(args.output_dir / f"{zero_based_frame:04d}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
