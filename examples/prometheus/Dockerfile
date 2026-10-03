FROM python:3.13.7-slim-bookworm

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py traffic.py ./
USER 65534:65534
EXPOSE 8080
CMD ["python", "-u", "app.py"]
