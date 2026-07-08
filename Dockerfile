# Use python 3.10-slim as the base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    DATABASE_URL="sqlite:////code/backend/glaucoma.db"

# Set working directory to /code
WORKDIR /code

# Install system dependencies (e.g. gcc for passlib bcrypt compilation, reportlab fonts, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first for caching
COPY backend/requirements.txt /code/backend/requirements.txt

# Install dependencies, ensuring we use headless OpenCV for minimal servers
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /code/backend/requirements.txt && \
    pip uninstall -y opencv-python && \
    pip install --no-cache-dir opencv-python-headless

# Copy backend files and ML model directory
COPY backend /code/backend
COPY ml /code/ml

# Create the uploads folder with write permissions
RUN mkdir -p /code/uploads && chmod -R 777 /code/uploads

# Expose port 7860 (Hugging Face Spaces requirement)
EXPOSE 7860

# Set working directory to /code/backend
WORKDIR /code/backend

# Run the FastAPI server on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
