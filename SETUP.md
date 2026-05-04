# 🚀 Setup Instructions

## Bước 1: Tạo GitHub Repository

1. Vào https://github.com/new
2. Tạo repository mới với tên: `token-expiry-monitor` (hoặc tên khác)
3. **KHÔNG** check "Add a README file" (vì đã có sẵn)
4. Click "Create repository"

## Bước 2: Push Code lên GitHub

Chạy các lệnh sau trong terminal:

```bash
# Thêm remote repository (thay YOUR_USERNAME và YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push code lên GitHub
git branch -M main
git push -u origin main
```

## Bước 3: Enable GitHub Pages

1. Vào repository Settings
2. Scroll xuống "Pages" section
3. Source: chọn "Deploy from a branch"
4. Branch: chọn "main"
5. Folder: chọn "/docs"
6. Click "Save"

Dashboard sẽ available tại: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Bước 4: Setup GitHub Secrets (Tùy chọn)

Vào Settings > Secrets and variables > Actions, thêm:

### Bắt buộc:
- `TOKEN_URL`: (đã có default trong code)

### Tùy chọn (để nhận thông báo):
- `SLACK_WEBHOOK_URL`: Slack webhook URL
- `DISCORD_WEBHOOK_URL`: Discord webhook URL
- `EMAIL_SERVICE_URL`: Email service URL

## Bước 5: Test GitHub Actions

1. Vào Actions tab
2. Chọn "Token Expiry Check" workflow
3. Click "Run workflow" để test

## 🎯 Kết quả

Sau khi setup xong:

✅ **GitHub Actions** sẽ chạy mỗi 6 tiếng tự động
✅ **Dashboard** sẽ available tại GitHub Pages URL
✅ **Notifications** sẽ gửi khi token sắp hết hạn
✅ **Manual trigger** có thể chạy bất cứ lúc nào

## 🔧 Customization

### Thay đổi lịch chạy:
Sửa file `.github/workflows/token-expiry-check.yml`:
```yaml
schedule:
  - cron: '0 */2 * * *'  # Mỗi 2 tiếng
```

### Thay đổi ngưỡng cảnh báo:
Sửa file `.github/scripts/check-token.js`:
```javascript
const WARNING_THRESHOLDS = {
  CRITICAL: 12 * 60 * 60, // 12 giờ
  WARNING: 3 * 24 * 60 * 60, // 3 ngày
};
```

## 📱 Dashboard URLs

- **GitHub Pages**: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
- **Full Dashboard**: Deploy folder `dashboard/` lên Vercel/Netlify

## 🆘 Troubleshooting

### GitHub Actions không chạy:
- Kiểm tra Actions tab có enabled không
- Kiểm tra workflow syntax
- Xem logs trong Actions tab

### Dashboard không hiển thị:
- Kiểm tra GitHub Pages settings
- Đợi vài phút để deploy
- Kiểm tra browser console có lỗi không

### Token check lỗi:
- Kiểm tra TOKEN_URL có accessible không
- Xem logs trong GitHub Actions
- Test manual trigger

## 📞 Support

Nếu có vấn đề, check:
1. GitHub Actions logs
2. Browser console (F12)
3. Repository Issues tab