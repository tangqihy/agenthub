"""
Skills Router - 本地skills管理 + OpenClaw水产市场
"""
import os
import re
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.security import require_auth

router = APIRouter(
    prefix="/api/v2/skills",
    tags=["skills"],
    dependencies=[Depends(require_auth)],
)

# Skills目录路径
SKILLS_DIR = Path(os.environ.get("HERMES_SKILLS_DIR", "/root/.hermes/skills"))

# OpenClaw水产市场
MERCURY_SKILLS_BASE = "https://skills.mercuryagent.sh"


class SkillInfo(BaseModel):
    name: str
    description: str
    category: str
    path: str
    source: str = "local"  # local / openclawmp
    has_scripts: bool = False
    has_references: bool = False
    tags: list[str] = []
    installs: int = 0
    stars: int = 0


class SkillDetail(BaseModel):
    name: str
    description: str
    category: str
    path: str
    content: str
    source: str = "local"
    has_scripts: bool = False
    has_references: bool = False
    tags: list[str] = []


def parse_skill_md(file_path: Path) -> Optional[dict]:
    """解析SKILL.md文件，提取YAML frontmatter"""
    try:
        content = file_path.read_text(encoding="utf-8")
        
        # 提取YAML frontmatter
        match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
        if not match:
            return None
        
        frontmatter = match.group(1)
        body = content[match.end():]
        
        # 简单解析YAML
        result = {"content": body}
        for line in frontmatter.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                # 处理列表
                if value.startswith('[') and value.endswith(']'):
                    value = [v.strip().strip('"\'') for v in value[1:-1].split(',')]
                elif value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                
                result[key] = value
        
        return result
    except Exception:
        return None


def scan_skills_directory(base_dir: Path) -> list[dict]:
    """扫描skills目录，返回所有skills信息"""
    skills = []
    
    if not base_dir.exists():
        return skills
    
    # 遍历类别目录
    for category_dir in base_dir.iterdir():
        if not category_dir.is_dir() or category_dir.name.startswith('.'):
            continue
        
        # 遍历skill目录
        for skill_dir in category_dir.iterdir():
            if not skill_dir.is_dir() or skill_dir.name.startswith('.'):
                continue
            
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue
            
            parsed = parse_skill_md(skill_md)
            if not parsed:
                continue
            
            skill_info = {
                "name": parsed.get("name", skill_dir.name),
                "description": parsed.get("description", ""),
                "category": parsed.get("category", category_dir.name),
                "path": str(skill_dir.relative_to(base_dir)),
                "source": "local",
                "has_scripts": (skill_dir / "scripts").exists(),
                "has_references": (skill_dir / "references").exists(),
                "tags": parsed.get("tags", []) if isinstance(parsed.get("tags"), list) else [],
                "installs": 0,
                "stars": 0,
            }
            skills.append(skill_info)
    
    return skills


async def search_mercury_skills(
    query: str = "",
    limit: int = 20,
) -> list[dict]:
    """从Mercury Skills Registry搜索skills"""
    try:
        params = {
            "q": query,
            "limit": limit,
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{MERCURY_SKILLS_BASE}/api/skills", params=params)
            resp.raise_for_status()
            data = resp.json()
            
            results = []
            for item in data.get("skills", []):
                results.append({
                    "name": item.get("slug", ""),
                    "description": item.get("description", ""),
                    "category": item.get("category", "skill"),
                    "path": "",
                    "source": "mercury",
                    "has_scripts": False,
                    "has_references": False,
                    "tags": item.get("tags", []),
                    "installs": item.get("stats", {}).get("downloads", 0),
                    "stars": item.get("stats", {}).get("likes", 0),
                })
            
            return results
    except Exception as e:
        print(f"Mercury Skills search error: {e}")
        return []


@router.get("/", response_model=list[SkillInfo])
async def list_skills(
    category: Optional[str] = Query(None, description="按类别筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    source: Optional[str] = Query(None, description="来源: local / openclawmp / all"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """获取skills列表（本地+在线市场）"""
    source = source or "local"
    skills = []
    
    # 获取本地skills
    if source in ("local", "all"):
        local_skills = scan_skills_directory(SKILLS_DIR)
        skills.extend(local_skills)
    
    # 获取在线市场skills
    if source in ("mercury", "all"):
        online_skills = await search_mercury_skills(search or "", limit)
        skills.extend(online_skills)
    
    # 按类别筛选
    if category:
        skills = [s for s in skills if s["category"].lower() == category.lower()]
    
    # 搜索（本地）
    if search and source != "mercury":
        search_lower = search.lower()
        skills = [
            s for s in skills
            if search_lower in s["name"].lower()
            or search_lower in s["description"].lower()
            or any(search_lower in tag.lower() for tag in s.get("tags", []))
        ]
    
    # 分页
    total = len(skills)
    skills = skills[offset:offset + limit]
    
    return skills


@router.get("/categories")
async def list_categories():
    """获取所有skill类别"""
    skills = scan_skills_directory(SKILLS_DIR)
    categories = list(set(s["category"] for s in skills))
    categories.sort()
    return categories


@router.get("/search")
async def search_skills(
    q: str = Query(..., description="搜索关键词"),
    source: str = Query("all", description="来源: local / openclawmp / all"),
    limit: int = Query(20, ge=1, le=100),
):
    """搜索skills"""
    skills = []
    
    # 搜索本地
    if source in ("local", "all"):
        local_skills = scan_skills_directory(SKILLS_DIR)
        search_lower = q.lower()
        local_filtered = [
            s for s in local_skills
            if search_lower in s["name"].lower()
            or search_lower in s["description"].lower()
            or any(search_lower in tag.lower() for tag in s.get("tags", []))
        ]
        skills.extend(local_filtered)
    
    # 搜索在线市场
    if source in ("mercury", "all"):
        online_skills = await search_mercury_skills(q, "skill", limit)
        skills.extend(online_skills)
    
    return skills[:limit]


@router.get("/{category}/{name}", response_model=SkillDetail)
async def get_skill(category: str, name: str):
    """获取skill详情"""
    skill_path = SKILLS_DIR / category / name
    
    if not skill_path.exists():
        raise HTTPException(404, "Skill not found")
    
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        raise HTTPException(404, "Skill not found")
    
    parsed = parse_skill_md(skill_md)
    if not parsed:
        raise HTTPException(500, "Failed to parse SKILL.md")
    
    return SkillDetail(
        name=parsed.get("name", name),
        description=parsed.get("description", ""),
        category=parsed.get("category", category),
        path=str(skill_path.relative_to(SKILLS_DIR)),
        content=parsed.get("content", ""),
        source="local",
        has_scripts=(skill_path / "scripts").exists(),
        has_references=(skill_path / "references").exists(),
        tags=parsed.get("tags", []) if isinstance(parsed.get("tags"), list) else [],
    )


@router.get("/openclawmp/{asset_id}")
async def get_openclawmp_asset(asset_id: str):
    """获取OpenClaw水产市场资产详情"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 获取资产信息
            resp = await client.get(f"{OPENCLAWMP_BASE}/api/v1/assets/{asset_id}")
            resp.raise_for_status()
            asset = resp.json()
            
            # 获取README
            readme_resp = await client.get(f"{OPENCLAWMP_BASE}/api/v1/assets/{asset_id}/readme")
            readme_content = ""
            if readme_resp.status_code == 200:
                readme_content = readme_resp.text
            
            return {
                "name": asset.get("name", ""),
                "description": asset.get("description", ""),
                "category": asset.get("type", "skill"),
                "path": "",
                "content": readme_content,
                "source": "mercury",
                "tags": asset.get("tags", []),
                "installs": asset.get("stats", {}).get("installs", 0),
                "stars": asset.get("stats", {}).get("stars", 0),
            }
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch asset: {e}")
