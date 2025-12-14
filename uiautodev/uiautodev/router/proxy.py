"""
proxy.py - 已废弃

此文件已被静态文件服务替代。
原本的 HTTP 缓存代理机制已不再需要。

如果需要恢复原始功能，请参考 Git 历史记录。
"""

# 保留空路由以避免导入错误
from fastapi import APIRouter

router = APIRouter()

# 不再提供任何路由
# 所有静态资源现在通过 app.py 中的 StaticFiles 提供
