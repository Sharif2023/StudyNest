<?php
// cloudinary_config.php
// Cloudinary API configuration for StudyNest

// Cloudinary credentials - You need to get these from your Cloudinary dashboard
// Go to: https://cloudinary.com/console -> Settings -> API Keys
return [
    'cloud_name' => $_ENV['CLOUDINARY_CLOUD_NAME'] ?? 'doyi7vchh',
    'api_key' => $_ENV['CLOUDINARY_API_KEY'] ?? '874563878153379',
    'api_secret' => $_ENV['CLOUDINARY_API_SECRET'] ?? 'RYXYbuH1eQvLsrVyZL8pB9AfAiY',
    'upload_preset' => $_ENV['CLOUDINARY_UPLOAD_PRESET'] ?? 'studynest_recordings'
];

// To get your API credentials:
// 1. Go to https://cloudinary.com/console
// 2. Sign in to your account
// 3. Go to Settings -> API Keys
// 4. Copy the API Key and API Secret
// 5. Replace 'your_api_key_here' and 'your_api_secret_here' above
?>
