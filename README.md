---
title: Glaucoma EyeCare AI Platform API
emoji: 👁️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Glaucoma EyeCare AI Platform API

This is the FastAPI backend for the Glaucoma EyeCare platform, running in a Docker container on Hugging Face Spaces.

## Features
* **Ophthalmology ML Classifier**: Evaluates retina fundus scans using MobileNetV2.
* **Explainable AI (XAI)**: Generates optic disc/cup Grad-CAM visual localization heatmaps.
* **Telehealth WebRTC**: Signal broker for real-time video consult rooms.
* **Clinical PDF Reports**: Generates downloadable PDF diagnostic reviews.
* **Built-in Seeding**: Automatically initializes demonstration accounts (`patient@glaucoma.org`, `doctor@glaucoma.org`, `admin@glaucoma.org` with password `password123`) on startup if empty.
