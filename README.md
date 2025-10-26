# 🚀 Quick Start Commands

A guide for running each part of **StudyNest**.

---

## 1) Frontend — React + Vite + Tailwind

```bash
cd StudyNest
npm run dev
```

## 2) AI Checker

```bash
cd study-nest
php -S localhost:8000 -t .
```

## 3) Music (Icons)

```bash
npm install lucide-react
```

## 4) Video Room (Realtime)

```bash
cd study-nest/src/realtime
npm i
npm start
```
## 5) Paraphrasing & Summarizing Tool (Python + Flask)

#### Create a virtual environment

```bash
python -m venv .venv
```

#### Go to backend

```bash
cd study-nest
```

#### Activate the venv

```bash
.venv\Scripts\activate
```

#### (If needed) allow scripts

```bash
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### VS Code: 

```bash
Ctrl+Shift+P → Python: Select Interpreter → choose: .venv\Scripts\python.exe
```

#### Install dependencies

```bash
pip install flask flask-cors nltk
```

#### Run the tool

```bash
python src/Python/sampar.py
```

---

## 6) Chatbot (PHP Composer)

```bash
composer install
```

## 7) Uploads Directory — .htaccess

Create this file at:

```bash
C:\xampp\htdocs\StudyNest\study-nest\src\api\uploads\.htaccess
```

paste:

```bash
# Allow direct access to uploaded files
Options -Indexes

# Set correct MIME types for common file formats
<IfModule mod_mime.c>
  AddType application/pdf .pdf
  AddType image/jpeg .jpg .jpeg
  AddType image/png .png
  AddType image/webp .webp
  AddType image/gif .gif
  AddType application/msword .doc
  AddType application/vnd.openxmlformats-officedocument.wordprocessingml.document .docx
  AddType application/vnd.ms-powerpoint .ppt
  AddType application/vnd.openxmlformats-officedocument.presentationml.presentation .pptx
  AddType text/plain .txt
  AddType application/zip .zip
  AddType application/x-rar-compressed .rar
</IfModule>

# Security: block PHP execution here
<FilesMatch "\.php$">
  Deny from all
</FilesMatch>
```

---
