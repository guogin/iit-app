# 构建阶段
FROM node:24-alpine AS builder
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建生产环境版本
RUN npm run build

# 运行阶段：使用 nginx 服务静态文件
FROM nginx:alpine

# 复制构建好的静态文件到 nginx 目录
COPY --from=builder /app/build /usr/share/nginx/html

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
