import asyncio
import hashlib
import json
import logging
from pathlib import Path
from typing import Optional

import httpx
import websockets
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse
from starlette.background import BackgroundTask

logger = logging.getLogger(__name__)
router = APIRouter()
cache_dir = Path("./cache")
# 完全本地化：使用原始 URL 格式计算 hash，以匹配现有缓存文件
base_url = 'https://uiauto.dev'

@router.get("/")
@router.get("/android/{path:path}")
@router.get("/ios/{path:path}")
@router.get("/demo/{path:path}")
@router.get("/harmony/{path:path}")
async def proxy_html(request: Request):
    """完全本地化：仅使用缓存，不请求远程服务器"""
    cache = HTTPCache(cache_dir, base_url, key='homepage')
    response = await cache.get_cached_response(request)
    if not response:
        logger.warning(f"缓存未命中: {request.url.path}，请确保已有缓存文件")
        return Response(
            content=b"<html><body><h1>BoolTox UI Auto Dev - Local Mode</h1><p>Please ensure cache files exist.</p></body></html>",
            status_code=200,
            headers={"content-type": "text/html; charset=utf-8"}
        )
    return response

@router.get("/assets/{path:path}")
@router.get('/favicon.ico')
async def proxy_assets(request: Request, path: str = ""):
    """完全本地化：仅使用缓存资源，使用完整 URL 计算 hash"""
    # 使用完整 URL 格式计算 hash，以匹配缓存文件命名
    target_url = f"{base_url}{request.url.path}"
    cache = HTTPCache(cache_dir, target_url)
    response = await cache.get_cached_response(request)
    if not response:
        logger.warning(f"资源缓存未命中: {request.url.path} (hash from: {target_url})")
        return Response(content=b"", status_code=404)
    return response


class HTTPCache:
    """完全本地化的缓存类：仅读取本地缓存，不发起任何远程请求"""
    def __init__(self, cache_dir: Path, target_url: str, key: Optional[str] = None):
        self.cache_dir = cache_dir
        self.target_url = target_url
        self.key = key or hashlib.md5(target_url.encode()).hexdigest()
        self.file_body = self.cache_dir / 'http' / (self.key + ".body")
        self.file_headers = self.file_body.with_suffix(".headers")

    async def get_cached_response(self, request: Request):
        """仅从本地缓存读取，不发起远程请求"""
        if request.method == 'GET' and self.file_body.exists():
            logger.info(f"本地缓存命中: {self.file_body}")
            headers = {}
            if self.file_headers.exists():
                with self.file_headers.open('rb') as f:
                    headers = json.load(f)
            body_fd = self.file_body.open("rb")
            return StreamingResponse(
                content=body_fd,
                status_code=200,
                headers=headers,
                background=BackgroundTask(body_fd.close)
            )
        logger.debug(f"本地缓存未命中: {self.file_body}")
        return None


# 注意：WebSocket 转发和反向代理功能已移除
# 本地化版本不再需要这些远程请求功能
# 如需恢复，请参考原始 uiautodev 项目