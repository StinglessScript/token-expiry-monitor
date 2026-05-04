# Token Monitor Dashboard

Real-time web dashboard để theo dõi trạng thái OAuth token expiry với API backend và database.

## 🚀 Tính năng

### 📊 Dashboard Features
- **Real-time monitoring**: Theo dõi token status live
- **Interactive charts**: Biểu đồ timeline expiry
- **GitHub Actions integration**: Theo dõi workflow status
- **Multi-channel notifications**: Slack, Discord, Email
- **Activity logs**: Lịch sử kiểm tra chi tiết
- **Test notifications**: Gửi thử thông báo
- **Responsive design**: Tương thích mobile

### 🔧 API Endpoints
- `GET /api/token/status` - Current token status
- `GET /api/token/history` - Token check history
- `GET /api/github/actions` - GitHub Actions status
- `GET /api/notifications` - Notification channels status
- `POST /api/notifications/test` - Send test notifications
- `GET /api/health` - Health check

## 🛠️ Cài đặt

### 1. Cài đặt dependencies
```bash
cd dashboard
npm install
```

### 2. Cấu hình environment variables
Tạo file `.env`:
```env
# Server
PORT=3000

# Token monitoring
TOKEN_URL=https://id.dev.longvan.vn/authorization/public/TRUE_DOC/oauth2/api/v1/token/4dd0726c-594e-4509-8118-528d8be46deb

# GitHub integration (optional)
GITHUB_TOKEN=your_github_token
REPO_OWNER=your-username
REPO_NAME=your-repo-name

# Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
EMAIL_SERVICE_URL=https://your-email-service.com/send
```

### 3. Chạy dashboard
```bash
# Development
npm run dev

# Production
npm start
```

Dashboard sẽ chạy tại: http://localhost:3000

## 🌐 Deployment Options

### Option 1: GitHub Pages (Static)
- Sử dụng file `docs/index.html` đã tạo
- Tự động deploy khi push code
- Không cần server backend
- Chỉ hiển thị thông tin cơ bản

### Option 2: Full Dashboard (với API)
- Chạy Express server với API backend
- Real-time data và history
- Test notifications
- Cần hosting có hỗ trợ Node.js

### Option 3: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY dashboard/package*.json ./
RUN npm ci --only=production
COPY dashboard/ .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t token-monitor .
docker run -p 3000:3000 --env-file .env token-monitor
```

### Option 4: Vercel/Netlify
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "dashboard/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dashboard/server.js"
    }
  ]
}
```

## 📱 Screenshots Dashboard

### Main Dashboard
- Token status với countdown
- GitHub Actions workflow status  
- Notification channels status
- Real-time metrics

### Charts & Analytics
- Token expiry timeline
- Historical data trends
- Status change tracking

### Activity Logs
- Detailed check history
- Error tracking
- Notification logs

## 🔧 Customization

### Thay đổi check interval
```javascript
// server.js
const CONFIG = {
  CHECK_INTERVAL: 2 * 60 * 60 * 1000, // 2 hours
  // ...
};
```

### Thêm notification channels
```javascript
// Thêm vào server.js
async function sendTelegramNotification(level, message, data) {
  // Implementation
}
```

### Custom styling
Sửa CSS trong `public/dashboard.html` hoặc tạo file CSS riêng.

## 🔒 Security

- ✅ Environment variables cho sensitive data
- ✅ CORS configuration
- ✅ Input validation
- ✅ Rate limiting (có thể thêm)
- ✅ HTTPS ready

## 📊 Monitoring & Alerts

### Health Checks
```bash
curl http://localhost:3000/api/health
```

### Metrics Available
- Token expiry countdown
- Check success rate
- Notification delivery status
- API response times

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **GitHub API rate limits**
   - Thêm GITHUB_TOKEN để tăng rate limit
   - Hoặc giảm frequency check

3. **Notification failures**
   - Kiểm tra webhook URLs
   - Test với `/api/notifications/test`

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📈 Performance

- Lightweight Express server
- In-memory caching
- Efficient API calls
- Responsive frontend

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details