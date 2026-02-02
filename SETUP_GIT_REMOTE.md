# Setting Up Git Remote for EAS Build

## Option A: If you already have a GitHub/GitLab/Bitbucket repository

1. **Add the remote:**
   ```bash
   git remote add origin <your-repository-url>
   ```
   
   Example:
   ```bash
   git remote add origin https://github.com/yourusername/audioly.git
   ```

2. **Push your code:**
   ```bash
   git push -u origin master
   ```

3. **Build with EAS:**
   ```bash
   eas build --platform android --profile production
   ```

## Option B: Create a new GitHub repository

1. **Go to GitHub** and create a new repository:
   - Visit: https://github.com/new
   - Name it: `audioly` (or any name you prefer)
   - Don't initialize with README, .gitignore, or license
   - Click "Create repository"

2. **Add the remote:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/audioly.git
   ```
   (Replace YOUR_USERNAME with your GitHub username)

3. **Push your code:**
   ```bash
   git push -u origin master
   ```

4. **Build with EAS:**
   ```bash
   eas build --platform android --profile production
   ```

## Option C: Use GitLab or Bitbucket

Similar process, just use your GitLab/Bitbucket repository URL instead.

