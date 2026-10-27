import { FOUNDATION_RECORDS } from "~/demos/kafka-foundations/records";
import "~/demos/kafka-foundations/figures.css";

export function KafkaRecordFigure() {
  const record = FOUNDATION_RECORDS[0];
  return (
    <figure
      className="kafka-foundation-figure kafka-foundation-record-figure"
      data-graphic-frame="plate"
      data-graphic-key="kafka-foundation-record"
      aria-label="Record A: key, timestamp, and JSON value"
    >
      <div className="kafka-foundation-stage" data-graphic-stage="padded">
        <div className="kafka-foundation-record">
          <div className="kafka-foundation-record-header">
            <p className="kafka-foundation-record-id">{record.id}</p>
            <dl className="kafka-foundation-metadata">
              <div>
                <dt>Key</dt>
                <dd>{record.key}</dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>
                  <time dateTime={record.timestamp}>
                    <span>{record.timestamp.slice(0, 10)}</span>{" "}
                    <span>{record.timestamp.slice(11)}</span>
                  </time>
                </dd>
              </div>
            </dl>
          </div>
          <dl className="kafka-foundation-fields">
            <div>
              <dt>Value</dt>
              <dd>
                <pre tabIndex={0} aria-label="JSON record value">
                  <code>
                    {"{\n  "}
                    <span data-token="key">{JSON.stringify("event")}</span>
                    {": "}
                    <span data-token="string">
                      {JSON.stringify(record.event)}
                    </span>
                    {",\n  "}
                    <span data-token="key">{JSON.stringify("orderId")}</span>
                    {": "}
                    <span data-token="string">
                      {JSON.stringify(record.key)}
                    </span>
                    {",\n  "}
                    <span data-token="key">{JSON.stringify("occurredAt")}</span>
                    {": "}
                    <span data-token="string">
                      {JSON.stringify(record.occurredAt)}
                    </span>
                    {"\n}"}
                  </code>
                </pre>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </figure>
  );
}

export function KafkaTopicFigure() {
  return (
    <figure
      className="kafka-foundation-figure"
      data-graphic-frame="plate"
      data-graphic-key="kafka-foundation-topic"
      aria-label="The orders topic contains six example records, A through F"
    >
      <div className="kafka-foundation-stage" data-graphic-stage="padded">
        <div className="kafka-foundation-topic">
          <p className="kafka-foundation-topic-name">orders</p>
          <ul className="kafka-foundation-topic-records">
            {FOUNDATION_RECORDS.map((record) => (
              <li
                key={record.id}
                data-record-id={record.id}
                data-focused={record.id === "A"}
                style={{ backgroundColor: record.color }}
              >
                <span className="kafka-foundation-topic-id">{record.id}</span>
                <span>{record.event}</span>
                <span className="kafka-foundation-topic-key">{record.key}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
