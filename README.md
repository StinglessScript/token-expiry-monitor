# Token Status Monitor

GitHub Action để kiểm tra token status 24/7 và gửi cảnh báo khi token có vấn đề.

## Tính năng

- ✅ Kiểm tra token status mỗi 6 tiếng (có thể tùy chỉnh)
- 🚨 Cảnh báo khi token hết hạn hoặc có lỗi
- 📱 Hỗ trợ nhiều kênh thông báo (Slack, Discord, Email)
- 🔄 Tự động retry và error handling
- 📊 GitHub Actions annotations

## Cài đặt

### 1. Cấu hình GitHub Secrets

Vào repository Settings > Secrets and variables > Actions và thêm các secrets sau:

#### Bắt buộc:
- `TOKEN_URL`: URL của token cần kiểm tra (mặc định đã có trong code)

#### Tùy chọn (để nhận thông báo):
- `SLACK_WEBHOOK_URL`: Webhook URL của Slack channel
- `DISCORD_WEBHOOK_URL`: Webhook URL của Discord channel  
- `EMAIL_SERVICE_URL`: URL của email service (nếu có)

### 2. Cấu hình Slack Webhook (tùy chọn)

1. Vào Slack workspace > Apps > Incoming Webhooks
2. Tạo webhook mới cho channel muốn nhận thông báo
3. Copy webhook URL và thêm vào GitHub Secrets với tên `SLACK_WEBHOOK_URL`

### 3. Cấu hình Discord Webhook (tùy chọn)

1. Vào Discord server > Channel Settings > Integrations > Webhooks
2. Tạo webhook mới
3. Copy webhook URL và thêm vào GitHub Secrets với tên `DISCORD_WEBHOOK_URL`

## Cách hoạt động

### Lịch chạy
- **Tự động**: Mỗi 6 tiếng (0:00, 6:00, 12:00, 18:00 UTC)
- **Thủ công**: Có thể trigger từ GitHub Actions tab

### Mức độ cảnh báo

| Mức độ | Thời gian còn lại | Mô tả |
|--------|------------------|-------|
| 🚨 CRITICAL | ≤ 1 ngày | Token đã hết hạn hoặc sắp hết hạn |
| ⚠️ WARNING | ≤ 7 ngày | Cần gia hạn sớm |
| ℹ️ INFO | ≤ 30 ngày | Thông tin theo dõi |

## ⚠️ **Lưu ý quan trọng về Token API**

Token API hiện tại **KHÔNG cung cấp thông tin expiry**:
```json
{
  "accessToken": "4dd0726c-594e-4509-8118-528d8be46deb",
  "partyId": "20.185466.9361",
  // ... KHÔNG có expires_at, exp, expiration
}
```

## 🔧 **3 Giải pháp thay thế:**

### **Option 1: Token Validity Testing** ⭐ **Recommended**
- Kiểm tra token bằng cách gọi API protected
- Phát hiện khi token trả về 401 Unauthorized
- Workflow: `token-expiry-check.yml` (đã cập nhật)

### **Option 2: Manual Expiry Tracking**
- Nhập thủ công ngày hết hạn
- Tính toán countdown dựa trên ngày đã nhập
- Workflow: `manual-expiry-tracking.yml`
- Chạy: Actions > Manual Token Expiry Tracking

### **Option 3: JWT Token Analysis**
- Nếu accessToken là JWT, decode để lấy expiry
- Script: `.github/scripts/check-jwt-token.js`
- Test: `node .github/scripts/check-jwt-token.js`

## Tùy chỉnh

### Thay đổi lịch chạy
Sửa file `.github/workflows/token-expiry-check.yml`:

```yaml
on:
  schedule:
    # Chạy mỗi 2 tiếng
    - cron: '0 */2 * * *'
    # Hoặc chạy hàng ngày lúc 9:00 UTC
    - cron: '0 9 * * *'
```

### Thay đổi ngưỡng cảnh báo
Sửa file `.github/scripts/check-token.js`:

```javascript
const WARNING_THRESHOLDS = {
  CRITICAL: 12 * 60 * 60, // 12 giờ
  WARNING: 3 * 24 * 60 * 60, // 3 ngày  
  INFO: 14 * 24 * 60 * 60 // 14 ngày
};
```

## Chạy thử nghiệm

### Local testing
```bash
npm install
npm run check-token
```

### Manual trigger trên GitHub
1. Vào repository > Actions tab
2. Chọn "Token Expiry Check" workflow
3. Click "Run workflow"

## Troubleshooting

### Lỗi thường gặp

1. **Token URL không accessible**
   - Kiểm tra URL có đúng không
   - Kiểm tra network/firewall settings

2. **Không tìm thấy expiry field**
   - Script sẽ tự động tìm các field phổ biến
   - Kiểm tra response format của API

3. **Webhook không hoạt động**
   - Kiểm tra webhook URL trong secrets
   - Test webhook URL trực tiếp

### Debug logs
Tất cả logs được hiển thị trong GitHub Actions console để debug.

## Bảo mật

- ✅ Không log sensitive data
- ✅ Sử dụng GitHub Secrets cho credentials
- ✅ Timeout cho HTTP requests
- ✅ Error handling đầy đủ

## 📊 Dashboard để theo dõi

Có 2 tùy chọn dashboard để theo dõi trạng thái token:

### 1. GitHub Pages Dashboard (Đơn giản)
- **URL**: `https://your-username.github.io/your-repo-name/`
- **Tính năng**: Hiển thị token status, GitHub Actions status
- **Setup**: Tự động deploy khi push code
- **File**: `docs/index.html`

### 2. Full Dashboard với API (Nâng cao)
- **URL**: `http://localhost:3000` (hoặc domain của bạn)
- **Tính năng**: 
  - Real-time monitoring với API backend
  - Interactive charts và analytics
  - Activity logs chi tiết
  - Test notifications
  - Token history tracking
- **Setup**: Cần chạy Node.js server
- **Folder**: `dashboard/`

#### Chạy Full Dashboard:
```bash
cd dashboard
npm install
npm start
# Dashboard chạy tại http://localhost:3000
```

#### Environment variables cho Full Dashboard:
```env
TOKEN_URL=https://id.dev.longvan.vn/authorization/public/TRUE_DOC/oauth2/api/v1/token/4dd0726c-594e-4509-8118-528d8be46deb
GITHUB_TOKEN=your_github_token (optional)
REPO_OWNER=your-username (optional)
REPO_NAME=your-repo-name (optional)
SLACK_WEBHOOK_URL=your_slack_webhook (optional)
DISCORD_WEBHOOK_URL=your_discord_webhook (optional)
```

### Deployment Options:
- **GitHub Pages**: Tự động với static dashboard
- **Vercel/Netlify**: Deploy full dashboard miễn phí
- **Docker**: Container deployment
- **VPS/Cloud**: Traditional hosting

Chi tiết setup xem trong `dashboard/README.md`

## License

MIT License