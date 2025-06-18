# Keycloak 配置指南（不使用docker-compose的情况下单独配置）

## 1. 安装 Keycloak
你可以选择本地安装 Keycloak 或使用 Docker 运行。
使用 Docker 运行 Keycloak（推荐）：
```bash
docker run -d --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```
然后，你可以通过 http://localhost:8080 访问 Keycloak 管理界面。

## 2. 创建 Realm
默认情况下，Keycloak 只有一个 master realm，我们需要创建一个新的 Realm：
1. 访问 http://localhost:8080/admin
2. 使用 admin/admin 登录
3. 点击 Create Realm
4. 输入 Realm Name（如 scrumix-app）并点击 Create

## 3. 创建 Client（用于 OAuth2 认证）
1. 进入 scrumix-app Realm
2. 在左侧菜单选择 Clients
3. 点击 Create Client
4. Client ID: scrumix-client
5. Client Type: OpenID Connect
6. Root URL: http://localhost:3000（Next.js 前端地址）
7. 点击 Next
8. Client authentication: ON（后端 FastAPI 需要）
9. Authentication flow: Standard Flow（用于授权码模式）
10. Valid redirect URIs: http://localhost:8000/api/auth/callback/keycloak
11. Web origins: http://localhost:3000
12. 点击 Save

## 4. 配置 Client 的权限
1. 在 scrumix-client 的 Settings 选项卡
2. Access Type: confidential
3. Service Accounts Enabled: ON
4. Authorization Enabled: ON
5. Save 之后，转到 Credentials 选项卡
6. 记住 Client Secret（用于 FastAPI 服务器端验证）

## 5. 创建用户
1. 在左侧菜单选择 Users
2. 点击 Add User
3. 填写：
   - Username: alice
   - Email: alice@scrumix.ai
   - First Name: Alice
   - Last Name: Abernathy
4. Save
5. 进入 Credentials 选项卡，设置密码：
6. New Password: testpassword
7. Temporary: OFF
8. Set Password

## 6. 获取 OAuth2 端点
你可以在以下 API 端点找到 OpenID Connect 认证信息：

```bash
http://localhost:8080/realms/scrumix-app/.well-known/openid-configuration
```
这个端点会返回 JSON 配置，包括：
- authorization_endpoint: http://localhost:8080/realms/scrumix-app/protocol/openid-connect/auth
- token_endpoint: http://localhost:8080/realms/scrumix-app/protocol/openid-connect/token
- userinfo_endpoint: http://localhost:8080/realms/scrumix-app/protocol/openid-connect/userinfo
- jwks_uri: http://localhost:8080/realms/scrumix-app/protocol/openid-connect/certs

## 7. 配置角色（可选）
如果你的应用需要角色权限：

1. 在左侧菜单选择 Roles 
2. 点击 Add Role
3. Role Name: admin
4. 点击 Save
5. 进入 Users > alice > Role Mappings
6. 在 Available Roles 选择 admin
7. 点击 Add Selected
8. 测试 Keycloak
9.  你可以使用 Postman 或 curl 测试 Keycloak：
10. 
```bash
curl -X POST "http://localhost:8080/realms/scrumix-app/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=password" \
     -d "client_id=scrumix-client" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "username=testuser" \
     -d "password=testpassword"
```
如果成功，你会得到一个 access_token，它可以用于 FastAPI 认证。
