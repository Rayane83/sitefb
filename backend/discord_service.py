import os
import re
import aiohttp
import logging
from typing import List, Dict, Optional, Any
from database import get_database
from models import User, Guild, UserGuildRole, Role

logger = logging.getLogger(__name__)

class DiscordService:
    def __init__(self):
        self.client_id = os.environ.get('DISCORD_CLIENT_ID')
        self.client_secret = os.environ.get('DISCORD_CLIENT_SECRET')
        self.bot_token = os.environ.get('DISCORD_BOT_TOKEN')  # Will need this for bot operations
        self.base_url = "https://discord.com/api/v10"
    
    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get Discord user info from access token"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                async with session.get(f"{self.base_url}/users/@me", headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.error(f"Failed to get user info: {resp.status}")
                    return None
        except Exception as e:
            logger.error(f"Error getting user info: {e}")
            return None
    
    async def get_user_guilds(self, access_token: str) -> List[Dict[str, Any]]:
        """Get user's Discord guilds"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                async with session.get(f"{self.base_url}/users/@me/guilds", headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.error(f"Failed to get user guilds: {resp.status}")
                    return []
        except Exception as e:
            logger.error(f"Error getting user guilds: {e}")
            return []
    
    async def get_guild_member(self, guild_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get guild member info (requires bot token)"""
        if not self.bot_token:
            logger.warning("Bot token not configured")
            return None
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bot {self.bot_token}',
                    'Content-Type': 'application/json'
                }
                async with session.get(f"{self.base_url}/guilds/{guild_id}/members/{user_id}", headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    elif resp.status == 404:
                        logger.info(f"User {user_id} not found in guild {guild_id}")
                        return None
                    else:
                        logger.error(f"Failed to get guild member: {resp.status}")
                        return None
        except Exception as e:
            logger.error(f"Error getting guild member: {e}")
            return None
    
    async def get_guild_info(self, guild_id: str) -> Optional[Dict[str, Any]]:
        """Get guild information (requires bot token)"""
        if not self.bot_token:
            logger.warning("Bot token not configured")
            return None
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bot {self.bot_token}',
                    'Content-Type': 'application/json'
                }
                async with session.get(f"{self.base_url}/guilds/{guild_id}", headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.error(f"Failed to get guild info: {resp.status}")
                    return None
        except Exception as e:
            logger.error(f"Error getting guild info: {e}")
            return None
    
    async def get_guild_roles(self, guild_id: str) -> List[Dict[str, Any]]:
        """Get guild roles (requires bot token)"""
        if not self.bot_token:
            logger.warning("Bot token not configured")
            return []
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bot {self.bot_token}',
                    'Content-Type': 'application/json'
                }
                async with session.get(f"{self.base_url}/guilds/{guild_id}/roles", headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.error(f"Failed to get guild roles: {resp.status}")
                    return []
        except Exception as e:
            logger.error(f"Error getting guild roles: {e}")
            return []
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
        """Exchange OAuth code for access token"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'grant_type': 'authorization_code',
                    'code': code,
                    'redirect_uri': redirect_uri,
                }
                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
                async with session.post(f"{self.base_url}/oauth2/token", data=data, headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.error(f"Failed to exchange code for token: {resp.status}")
                    return None
        except Exception as e:
            logger.error(f"Error exchanging code for token: {e}")
            return None
    
    async def process_user_authentication(self, access_token: str) -> Optional[User]:
        """Process user authentication and store in database"""
        db = get_database()
        
        # Get user info from Discord
        user_info = await self.get_user_info(access_token)
        if not user_info:
            return None
        
        # Create or update user
        user = User(
            discord_id=user_info['id'],
            name=user_info.get('username', 'Unknown'),
            avatar=user_info.get('avatar'),
            discriminator=user_info.get('discriminator')
        )
        
        await db.upsert_user(user)
        return user
    
    async def sync_user_guilds(self, access_token: str, user_id: str) -> List[Guild]:
        """Sync user's guilds and roles"""
        db = get_database()
        
        # Get user's guilds
        guild_data = await self.get_user_guilds(access_token)
        synced_guilds = []
        
        for guild_info in guild_data:
            # Create or update guild
            guild = Guild(
                discord_guild_id=guild_info['id'],
                name=guild_info['name'],
                icon=guild_info.get('icon')
            )
            await db.upsert_guild(guild)
            synced_guilds.append(guild)
            
            # Get member info to get roles
            member_info = await self.get_guild_member(guild_info['id'], user_id)
            if member_info:
                # Get role names
                guild_roles = await self.get_guild_roles(guild_info['id'])
                role_names = []
                
                if guild_roles:
                    role_dict = {role['id']: role['name'] for role in guild_roles}
                    role_names = [role_dict.get(role_id, role_id) for role_id in member_info.get('roles', [])]
                
                # Determine enterprise from roles
                entreprise = self.extract_enterprise_from_roles(role_names)
                
                # Update user guild roles
                user_guild_role = UserGuildRole(
                    user_id=user_id,
                    guild_id=guild.id,
                    roles=role_names,
                    entreprise=entreprise
                )
                await db.upsert_user_guild_roles(user_guild_role)
        
        return synced_guilds
    
    def extract_enterprise_from_roles(self, roles: List[str]) -> Optional[str]:
        """Extract enterprise name from role names"""
        # Implementation based on the existing role parsing logic
        sep = r"[\s\-\|•:]+"
        lead_pattern = r"^(?:employ[eé]|emp|co[-\s]?patron|copatron|patron|dot)" + sep + r"(.+)$"
        trail_pattern = r"^(.+)" + sep + r"(?:employ[eé]|emp|co[-\s]?patron|copatron|patron|dot)$"
        
        banned_tokens = [
            'staff', 'patron', 'co-patron', 'co patron', 'copatron', 'employe', 'employé', 'emp', 'dot',
            '@everyone', 'everyone', 'bot'
        ]
        
        for role in roles:
            # Normalize the role name
            normalized = role.strip()
            
            # Try lead pattern
            match = re.search(lead_pattern, normalized, re.IGNORECASE)
            if match:
                enterprise = match.group(1).strip()
                if len(enterprise) >= 3 and not re.match(r"^co$", enterprise, re.IGNORECASE):
                    return enterprise
            
            # Try trail pattern
            match = re.search(trail_pattern, normalized, re.IGNORECASE)
            if match:
                enterprise = match.group(1).strip()
                if len(enterprise) >= 3 and not re.match(r"^co$", enterprise, re.IGNORECASE):
                    return enterprise
        
        # Fallback: if a role doesn't contain banned tokens, consider it as enterprise
        for role in roles:
            normalized = role.strip().lower()
            is_banned = any(token in normalized for token in banned_tokens)
            if not is_banned and len(role.strip()) >= 2:
                return role.strip()
        
        return None
    
    def resolve_role(self, roles: List[str]) -> Role:
        """Resolve user role from Discord roles"""
        # Normalize roles to lowercase for comparison
        lower_roles = [role.lower() for role in roles]
        
        # Check for staff role
        if any('staff' in role for role in lower_roles):
            return Role.STAFF
        
        # Check for co-patron role (must come before patron check)
        if any(re.search(r'co[-\s]?patron|copatron', role, re.IGNORECASE) for role in roles):
            return Role.CO_PATRON
        
        # Check for patron role
        if any('patron' in role for role in lower_roles):
            return Role.PATRON
        
        # Check for DOT role
        if any('dot' in role for role in lower_roles):
            return Role.DOT
        
        # Default to employee
        return Role.EMPLOYE

# Global Discord service instance
discord_service = DiscordService()