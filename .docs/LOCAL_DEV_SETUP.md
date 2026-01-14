# Local Development Setup - Quick Reference

## Your Configuration

**Local IP Address:** `192.168.1.2`  
**Backend Port:** `4000`  
**API URL:** `http://192.168.1.2:4000`

## ✅ Changes Made

1. **Updated API URL** (`constants/api.ts`)
   - Changed from Railway production to local IP
   - Now points to: `http://192.168.1.2:4000`

2. **Created Network Security Config** (`android/app/src/main/res/xml/network_security_config.xml`)
   - Allows HTTP traffic to your local IP
   - Required for Android to connect to local server

3. **Updated AndroidManifest.xml**
   - Added reference to network security config
   - Enables cleartext (HTTP) traffic

## 🚀 How to Start Development

### Step 1: Start Backend Server
```bash
cd c:\Users\vamsh\OneDrive\Desktop\audiololy\audiololy\backend
npm run dev
```

**Expected Output:**
```
Connected to MongoDB
Server listening on http://0.0.0.0:4000
Access from network: http://192.168.1.2:4000
```

### Step 2: Start Frontend (New Terminal)
```bash
cd c:\Users\vamsh\OneDrive\Desktop\audioly
npm start
```

### Step 3: Run on Android Device
Make sure your phone is on the **same WiFi network** (192.168.1.x)

**Option A: Physical Device**
```bash
npm run android
```

**Option B: Expo Go**
- Scan QR code from terminal
- Make sure phone is on same WiFi

## 🧪 Testing the Connection

### Test 1: Check Backend Health
Open browser and go to:
```
http://192.168.1.2:4000/health
```

Should return: `{"status":"ok"}`

### Test 2: Test from Phone
Once app is running, try:
- Login/Register
- Browse songs
- Upload a song
- Send listen together invite

## 🔧 Troubleshooting

### ❌ "Network request failed"
**Solution:**
1. Check if backend is running
2. Verify phone is on same WiFi (192.168.1.x)
3. Check firewall isn't blocking port 4000
4. Try accessing `http://192.168.1.2:4000/health` from phone browser

### ❌ "CLEARTEXT communication not permitted"
**Solution:**
1. Rebuild the Android app (changes to AndroidManifest require rebuild)
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### ❌ Backend not accessible from phone
**Solution:**
1. **Check Windows Firewall:**
   - Open Windows Defender Firewall
   - Allow Node.js through firewall
   - Or temporarily disable firewall for testing

2. **Create Firewall Rule:**
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### ❌ IP Address Changed
If your IP changes (reconnected to WiFi):
1. Run `ipconfig` to get new IP
2. Update `constants/api.ts` with new IP
3. Update `network_security_config.xml` with new IP
4. Restart Metro bundler

## 📱 Device Requirements

- Phone and PC must be on **same WiFi network**
- WiFi network: `bbrouter` (192.168.1.x)
- No VPN should be active on phone or PC

## 🔄 Switching Back to Production

When you want to deploy or test with production server:

**Update `constants/api.ts`:**
```typescript
export const API_BASE_URL = 'https://aduily-backend-production.up.railway.app';
```

## 📋 Quick Commands

### Start Both Servers (PowerShell)
```powershell
# Terminal 1
cd c:\Users\vamsh\OneDrive\Desktop\audiololy\audiololy\backend
npm run dev

# Terminal 2
cd c:\Users\vamsh\OneDrive\Desktop\audioly
npm start
```

### Check Your IP
```powershell
ipconfig | findstr IPv4
```

### Test Backend
```powershell
curl http://192.168.1.2:4000/health
```

### Clean Build (if needed)
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## 🎯 Current Status

- ✅ API URL configured for local development
- ✅ Network security config created
- ✅ AndroidManifest updated
- ✅ Ready to test Listen Together feature locally

## 📝 Notes

- Backend server is already configured to listen on `0.0.0.0` (all network interfaces)
- Port 4000 is the default backend port
- Remember to rebuild Android app after manifest changes
- Keep both terminals open while developing

## 🐛 Debug Checklist

If something doesn't work:
- [ ] Backend server is running (check terminal)
- [ ] Frontend Metro bundler is running
- [ ] Phone is on same WiFi (192.168.1.x)
- [ ] Firewall allows port 4000
- [ ] Android app was rebuilt after manifest changes
- [ ] No VPN is active
- [ ] Backend health endpoint works in browser

---

**Your Local IP:** 192.168.1.2  
**Backend URL:** http://192.168.1.2:4000  
**WiFi Network:** bbrouter (192.168.1.1)
