# Cloudinary Setup for Recording Deletion

To enable automatic deletion of recordings from Cloudinary when you delete them from StudyNest, you need to configure your Cloudinary API credentials.

## Steps to Setup:

### 1. Get Your Cloudinary API Credentials
1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign in to your account
3. Go to **Settings** → **API Keys**
4. Copy your:
   - **API Key**
   - **API Secret**

### 2. Configure StudyNest
1. Open the file: `study-nest/src/api/cloudinary_config.php`
2. Replace the placeholder values:
   ```php
   'api_key' => 'your_actual_api_key_here',
   'api_secret' => 'your_actual_api_secret_here',
   ```

### 3. Test the Setup
1. Create a test recording in a study room
2. Delete it from the Resource Library
3. Check that it's removed from both StudyNest and Cloudinary

## What This Does:
- ✅ **Database cleanup**: Removes recording metadata from your database
- ✅ **Cloud storage cleanup**: Automatically deletes the video file from Cloudinary
- ✅ **Storage savings**: Prevents accumulation of unused video files
- ✅ **Cost optimization**: Reduces Cloudinary storage costs

## Security Note:
- Keep your API credentials secure
- Never commit real credentials to version control
- Consider using environment variables for production

## Troubleshooting:
- Check server logs for any Cloudinary API errors
- Verify your API credentials are correct
- Ensure your Cloudinary account has deletion permissions
