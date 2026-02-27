# Docker 网络配置说明

## 容器网络架构

在 Docker Compose 环境中，有两种网络访问场景：

### 1. 容器间通信（服务器端）
- 使用 Docker 服务名作为主机名
- 例如：`http://backend:8000`, `http://db:5432`
- 不需要端口映射，容器可以直接访问内部端口

### 2. 浏览器访问（客户端）
- 浏览器在用户的电脑上运行，不在 Docker 网络中
- 必须使用宿主机地址：`http://localhost:8000`
- 需要端口映射：`8000:8000`

## 本项目配置

```
用户浏览器 → http://localhost:3000 → Frontend 容器
     ↓
http://localhost:8000 → Backend 容器
     ↓
backend:5432 (服务名) → DB 容器
```

### Frontend 配置
```yaml
environment:
  # 浏览器端使用 - 通过宿主机端口映射访问
  NEXT_PUBLIC_API_URL: http://localhost:8000
```

**为什么用 localhost？**
- `NEXT_PUBLIC_*` 变量会被注入到浏览器端代码
- 用户浏览器访问 `localhost:3000` 看前端，然后从浏览器发起请求到 `localhost:8000`
- 因为端口已映射到宿主机，所以可以访问

### Backend CORS 配置
```python
allow_origins=[
    "http://localhost:3000",     # 浏览器通过 localhost 访问
    "http://frontend:3000",      # 容器间 SSR 调用（如需要）
]
```

## 生产环境部署

在生产环境中，应该使用实际域名：

```bash
# .env 文件
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

然后更新 backend CORS：
```python
allow_origins=[
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

## 常见问题

### Q: 为什么不在容器内用 `http://backend:8000`？
A: 因为 `NEXT_PUBLIC_API_URL` 是给浏览器用的，浏览器不在 Docker 网络内，无法解析 `backend` 这个服务名。

### Q: 什么时候用服务名？
A: 只有在服务器端代码（如 Next.js 的 `getServerSideProps`）中容器间通信时才用服务名。

### Q: 如果需要容器内 SSR 调用后端怎么办？
A: 可以添加两个环境变量：
```yaml
environment:
  NEXT_PUBLIC_API_URL: http://localhost:8000  # 浏览器用
  API_URL: http://backend:8000                 # SSR 服务器端用
```

## 网络图示

```
┌─────────────────┐
│   用户浏览器     │
└────────┬────────┘
         │ http://localhost:3000
         │ http://localhost:8000
         ↓
┌─────────────────────────────────┐
│      宿主机 (Windows)           │
│  端口映射:                      │
│  3000 → frontend:3000           │
│  8000 → backend:8000            │
│  5432 → db:5432                 │
└────────┬────────────────────────┘
         │ Docker 网络
    ┌────┴────┬─────────┬─────┐
    ↓         ↓         ↓     ↓
┌────────┐ ┌────────┐ ┌────────┐
│Frontend│ │Backend │ │   DB   │
│  :3000 │ │  :8000 │ │  :5432 │
└────────┘ └────────┘ └────────┘
    │         │
    └────→────┘
    http://backend:8000
    (容器间可以用服务名)
```
