from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
import base64
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

# Import our models and services
from mysql_models import *
from mysql_database import get_database, init_database, close_database, MySQLDatabaseService
from discord_service import discord_service
from business_service import business_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(title="Flashback Enterprise API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Dependency to get database
async def get_db() -> MySQLDatabaseService:
    return get_database()

# Health check endpoints
@api_router.get("/")
async def root():
    return {"message": "Flashback Enterprise API", "version": "1.0.0", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Legacy status check endpoints (for compatibility)
@api_router.post("/status", response_model=dict)
async def create_status_check(input: dict, db: MySQLDatabaseService = Depends(get_db)):
    status_obj = {
        "id": str(uuid.uuid4()),
        "client_name": input.get("client_name", ""),
        "timestamp": datetime.utcnow()
    }
    # For MySQL, we'd need to create a proper model, but for now just return the object
    return status_obj

@api_router.get("/status")
async def get_status_checks(db: MySQLDatabaseService = Depends(get_db)):
    # Return some status checks - in a full implementation, this would query the database
    return []

# Authentication endpoints
@api_router.post("/auth/discord/callback")
async def discord_auth_callback(
    code: str = Form(...),
    redirect_uri: str = Form(...),
    db: MySQLDatabaseService = Depends(get_db)
):
    """Handle Discord OAuth callback"""
    try:
        # Exchange code for token
        token_data = await discord_service.exchange_code_for_token(code, redirect_uri)
        if not token_data:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        access_token = token_data.get('access_token')
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Process user authentication
        user = await discord_service.process_user_authentication(access_token)
        if not user:
            raise HTTPException(status_code=400, detail="Failed to authenticate user")
        
        # Sync user guilds
        guilds = await discord_service.sync_user_guilds(access_token, user.discord_id)
        
        return {
            "success": True,
            "user": user.dict(),
            "guilds": [guild.dict() for guild in guilds]
        }
    except Exception as e:
        logger.error(f"Discord auth callback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/user/{discord_id}")
async def get_user_by_discord_id(discord_id: str, db: DatabaseService = Depends(get_db)):
    """Get user by Discord ID"""
    user = await db.get_user_by_discord_id(discord_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Guild and Role endpoints
@api_router.get("/guilds/{guild_id}/roles/{user_id}")
async def get_user_guild_roles(guild_id: str, user_id: str, db: DatabaseService = Depends(get_db)):
    """Get user roles in a specific guild"""
    user_roles = await db.get_user_guild_roles(user_id, guild_id)
    if not user_roles:
        return {"roles": [], "entreprise": None}
    
    # Resolve the user's role
    resolved_role = discord_service.resolve_role(user_roles.roles)
    
    return {
        "roles": user_roles.roles,
        "entreprise": user_roles.entreprise,
        "resolved_role": resolved_role.value
    }

# Dashboard endpoints
@api_router.get("/dashboard/summary/{guild_id}")
async def get_dashboard_summary(
    guild_id: str,
    entreprise: str = Query(...),
    db: DatabaseService = Depends(get_db)
):
    """Get dashboard summary for an enterprise"""
    summary = await business_service.calculate_dashboard_summary(guild_id, entreprise)
    return summary.dict()

@api_router.get("/dashboard/employee-count/{guild_id}")
async def get_employee_count(
    guild_id: str,
    entreprise: str = Query(...),
    db: DatabaseService = Depends(get_db)
):
    """Get employee count for an enterprise"""
    count = await business_service.get_employee_count(guild_id, entreprise)
    return {"count": count}

# Dotation endpoints
@api_router.get("/dotation/{guild_id}")
async def get_dotation(
    guild_id: str,
    entreprise: str = Query(...),
    db: DatabaseService = Depends(get_db)
):
    """Get dotation data for an enterprise"""
    dotation_data = await db.get_dotation_data(guild_id, entreprise)
    if not dotation_data:
        # Return empty structure
        return {
            "rows": [],
            "soldeActuel": 0,
            "expenses": 0,
            "withdrawals": 0,
            "commissions": 0,
            "interInvoices": 0
        }
    
    return {
        "rows": [row.dict() for row in dotation_data.rows],
        "soldeActuel": dotation_data.solde_actuel,
        "expenses": dotation_data.expenses,
        "withdrawals": dotation_data.withdrawals,
        "commissions": dotation_data.commissions,
        "interInvoices": dotation_data.inter_invoices
    }

@api_router.post("/dotation/{guild_id}")
async def save_dotation(
    guild_id: str,
    dotation_request: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Save dotation data"""
    try:
        entreprise = dotation_request.get("entreprise", "")
        rows_data = dotation_request.get("rows", [])
        
        # Convert to DotationRow objects
        dotation_rows = [DotationRow(**row) for row in rows_data]
        
        # Process dotation
        dotation_data = await business_service.process_dotation(
            guild_id=guild_id,
            entreprise=entreprise,
            dotation_rows=dotation_rows,
            expenses=dotation_request.get("expenses", 0),
            withdrawals=dotation_request.get("withdrawals", 0),
            commissions=dotation_request.get("commissions", 0),
            inter_invoices=dotation_request.get("interInvoices", 0)
        )
        
        # Add archive entry
        await business_service.add_archive_entry(
            guild_id=guild_id,
            entry_type="Dotation",
            entreprise=entreprise,
            montant=sum(row.salaire + row.prime for row in dotation_rows),
            statut="Validé"
        )
        
        return {"success": True, "message": "Dotation saved successfully"}
    except Exception as e:
        logger.error(f"Error saving dotation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Staff Configuration endpoints
@api_router.get("/staff/config/{guild_id}")
async def get_staff_config(guild_id: str, db: DatabaseService = Depends(get_db)):
    """Get staff configuration"""
    config = await db.get_staff_config(guild_id)
    if not config:
        # Return default configuration
        default_paliers = [
            Bracket(
                min=0, max=50000, taux=15,
                sal_min_emp=2500, sal_max_emp=3500,
                sal_min_pat=4000, sal_max_pat=5500,
                pr_min_emp=500, pr_max_emp=1000,
                pr_min_pat=1000, pr_max_pat=2000
            ),
            Bracket(
                min=50001, max=100000, taux=25,
                sal_min_emp=3500, sal_max_emp=5000,
                sal_min_pat=5500, sal_max_pat=7500,
                pr_min_emp=1000, pr_max_emp=2000,
                pr_min_pat=2000, pr_max_pat=3500
            )
        ]
        return {"paliers": [p.dict() for p in default_paliers]}
    
    return {"paliers": [p.dict() for p in config.paliers]}

@api_router.post("/staff/config/{guild_id}")
async def save_staff_config(
    guild_id: str,
    config_data: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Save staff configuration"""
    try:
        paliers_data = config_data.get("paliers", [])
        paliers = [Bracket(**p) for p in paliers_data]
        
        staff_config = StaffConfig(guild_id=guild_id, paliers=paliers)
        await db.save_staff_config(staff_config)
        
        return {"success": True, "message": "Staff configuration saved"}
    except Exception as e:
        logger.error(f"Error saving staff config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Enterprise endpoints
@api_router.get("/enterprises/{guild_id}")
async def get_enterprises(guild_id: str, db: DatabaseService = Depends(get_db)):
    """Get all enterprises for a guild"""
    enterprises = await db.get_entreprises(guild_id)
    return [{"id": e.key, "name": e.name} for e in enterprises]

@api_router.post("/enterprises/{guild_id}")
async def create_enterprise(
    guild_id: str,
    enterprise_data: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Create or update an enterprise"""
    try:
        key = enterprise_data.get("key", "").lower().replace(" ", "-")
        name = enterprise_data.get("name", "")
        
        if not key or not name:
            raise HTTPException(status_code=400, detail="Key and name are required")
        
        enterprise = Entreprise(
            guild_id=guild_id,
            key=key,
            name=name,
            role_id=enterprise_data.get("roleId"),
            employee_role_id=enterprise_data.get("employeeRoleId"),
            enterprise_guild_id=enterprise_data.get("enterpriseGuildId")
        )
        
        await db.upsert_entreprise(enterprise)
        return {"success": True, "message": "Enterprise created/updated successfully"}
    except Exception as e:
        logger.error(f"Error creating enterprise: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/enterprises/{guild_id}/{key}")
async def delete_enterprise(guild_id: str, key: str, db: DatabaseService = Depends(get_db)):
    """Delete an enterprise"""
    success = await db.delete_entreprise(guild_id, key)
    if not success:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    return {"success": True, "message": "Enterprise deleted successfully"}

# Tax and Financial endpoints
@api_router.get("/tax/brackets/{guild_id}")
async def get_tax_brackets(
    guild_id: str,
    entreprise: str = Query(...),
    db: DatabaseService = Depends(get_db)
):
    """Get tax brackets for an enterprise"""
    tax_brackets = await db.get_tax_brackets(guild_id, entreprise)
    if not tax_brackets:
        # Return default brackets
        default_brackets = [
            Bracket(
                min=0, max=50000, taux=15,
                sal_min_emp=2500, sal_max_emp=3500,
                sal_min_pat=4000, sal_max_pat=5500,
                pr_min_emp=500, pr_max_emp=1000,
                pr_min_pat=1000, pr_max_pat=2000
            )
        ]
        return [b.dict() for b in default_brackets]
    
    return [b.dict() for b in tax_brackets.brackets]

@api_router.get("/tax/wealth/{guild_id}")
async def get_wealth_brackets(
    guild_id: str,
    entreprise: str = Query(...),
    db: DatabaseService = Depends(get_db)
):
    """Get wealth tax brackets"""
    tax_brackets = await db.get_tax_brackets(guild_id, entreprise)
    if not tax_brackets:
        # Return default wealth brackets
        default_wealth = [
            Wealth(min=0, max=1000000, taux=1),
            Wealth(min=1000001, max=5000000, taux=2.5)
        ]
        return [w.dict() for w in default_wealth]
    
    return [w.dict() for w in tax_brackets.wealth]

# Archive endpoints
@api_router.get("/archive/{guild_id}")
async def get_archive(
    guild_id: str,
    entreprise: Optional[str] = Query(None),
    db: DatabaseService = Depends(get_db)
):
    """Get archive entries"""
    entries = await db.get_archive_entries(guild_id)
    
    # Filter by enterprise if specified
    if entreprise:
        entries = [e for e in entries if e.entreprise == entreprise]
    
    return [
        {
            "id": e.id,
            "date": e.date,
            "type": e.type,
            "employe": e.employe,
            "entreprise": e.entreprise,
            "montant": e.montant,
            "statut": e.statut
        }
        for e in entries
    ]

@api_router.post("/archive/{guild_id}")
async def add_archive_entry(
    guild_id: str,
    entry_data: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Add archive entry"""
    try:
        entry = await business_service.add_archive_entry(
            guild_id=guild_id,
            entry_type=entry_data.get("type", ""),
            employe=entry_data.get("employe"),
            entreprise=entry_data.get("entreprise"),
            montant=entry_data.get("montant", 0),
            statut=entry_data.get("statut", "En attente")
        )
        
        return {"success": True, "entry": entry.dict()}
    except Exception as e:
        logger.error(f"Error adding archive entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Blanchiment endpoints
@api_router.get("/blanchiment/state/{scope}")
async def get_blanchiment_state(scope: str, db: DatabaseService = Depends(get_db)):
    """Get blanchiment state for a scope"""
    state = await db.get_blanchiment_state(scope)
    if not state:
        return {"enabled": False, "useGlobal": True}
    
    return {
        "enabled": state.enabled,
        "useGlobal": state.use_global,
        "percEntreprise": state.perc_entreprise,
        "percGroupe": state.perc_groupe
    }

@api_router.post("/blanchiment/state/{scope}")
async def save_blanchiment_state(
    scope: str,
    state_data: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Save blanchiment state"""
    try:
        state = BlanchimentState(
            scope=scope,
            enabled=state_data.get("enabled", False),
            use_global=state_data.get("useGlobal", True),
            perc_entreprise=state_data.get("percEntreprise", 15),
            perc_groupe=state_data.get("percGroupe", 80)
        )
        
        await db.save_blanchiment_state(state)
        return {"success": True, "message": "Blanchiment state saved"}
    except Exception as e:
        logger.error(f"Error saving blanchiment state: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/blanchiment/global/{guild_id}")
async def get_blanchiment_global(guild_id: str, db: DatabaseService = Depends(get_db)):
    """Get global blanchiment configuration"""
    config = await db.get_blanchiment_global(guild_id)
    if not config:
        return {"percEntreprise": 15, "percGroupe": 80}
    
    return {
        "percEntreprise": config.perc_entreprise,
        "percGroupe": config.perc_groupe
    }

@api_router.post("/blanchiment/global/{guild_id}")
async def save_blanchiment_global(
    guild_id: str,
    config_data: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Save global blanchiment configuration"""
    try:
        config = BlanchimentGlobal(
            guild_id=guild_id,
            perc_entreprise=config_data.get("percEntreprise", 15),
            perc_groupe=config_data.get("percGroupe", 80)
        )
        
        await db.save_blanchiment_global(config)
        return {"success": True, "message": "Global blanchiment config saved"}
    except Exception as e:
        logger.error(f"Error saving global blanchiment config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Document upload endpoints
@api_router.post("/documents/upload/{guild_id}")
async def upload_document(
    guild_id: str,
    file: UploadFile = File(...),
    entreprise: str = Form(...),
    document_type: str = Form(...),
    uploaded_by: str = Form(...),
    db: DatabaseService = Depends(get_db)
):
    """Upload a document (invoice or diploma)"""
    try:
        # Read file content
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Create document record
        document = Document(
            guild_id=guild_id,
            entreprise=entreprise,
            filename=file.filename or "unknown",
            content_type=file.content_type or "application/octet-stream",
            size=len(file_content),
            file_data=file_base64,
            uploaded_by=uploaded_by,
            document_type=document_type
        )
        
        await db.save_document(document)
        
        return {
            "success": True,
            "message": "Document uploaded successfully",
            "document_id": document.id
        }
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/documents/{guild_id}")
async def get_documents(
    guild_id: str,
    entreprise: str = Query(...),
    db: DatabaseService = Depends(get_db)
):
    """Get documents for an enterprise"""
    documents = await db.get_documents_by_entreprise(guild_id, entreprise)
    
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "content_type": doc.content_type,
            "size": doc.size,
            "uploaded_by": doc.uploaded_by,
            "document_type": doc.document_type,
            "created_at": doc.created_at.isoformat()
        }
        for doc in documents
    ]

@api_router.get("/documents/{guild_id}/{document_id}/download")
async def download_document(
    guild_id: str,
    document_id: str,
    db: DatabaseService = Depends(get_db)
):
    """Download a document"""
    document = await db.get_document_by_id(document_id)
    if not document or document.guild_id != guild_id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Return base64 data for frontend to handle
    return {
        "filename": document.filename,
        "content_type": document.content_type,
        "file_data": document.file_data
    }

# Company Configuration endpoints
@api_router.get("/company/config/{guild_id}")
async def get_company_config(
    guild_id: str,
    entreprise_id: Optional[str] = Query(None),
    db: DatabaseService = Depends(get_db)
):
    """Get company configuration"""
    config = await db.get_company_config(guild_id, entreprise_id)
    if not config:
        # Return default configuration
        return {
            "identification": {"label": "Entreprise", "type": "Société", "description": ""},
            "salaire": {"pourcentageCA": 5, "modes": {"caEmploye": True, "heuresService": False, "additionner": False}},
            "parametres": {},
            "gradeRules": [],
            "errorTiers": [],
            "roleDiscord": "",
            "employees": []
        }
    
    return config.dict()

@api_router.post("/company/config/{guild_id}")
async def save_company_config(
    guild_id: str,
    config_data: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Save company configuration"""
    try:
        config = CompanyConfig(
            guild_id=guild_id,
            entreprise_id=config_data.get("entreprise_id"),
            **config_data
        )
        
        await db.save_company_config(config)
        return {"success": True, "message": "Company configuration saved"}
    except Exception as e:
        logger.error(f"Error saving company config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Discord Configuration endpoints (for superadmin)
@api_router.get("/discord/config")
async def get_discord_config(db: DatabaseService = Depends(get_db)):
    """Get Discord configuration"""
    config = await db.get_discord_config()
    if not config:
        return {}
    return config.dict()

@api_router.post("/discord/config")
async def save_discord_config(
    config_data: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Save Discord configuration"""
    try:
        config = DiscordConfig(**config_data)
        await db.save_discord_config(config)
        return {"success": True, "message": "Discord configuration saved"}
    except Exception as e:
        logger.error(f"Error saving Discord config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Salary calculation endpoint
@api_router.post("/salary/calculate")
async def calculate_salary(
    salary_request: Dict[str, Any],
    db: DatabaseService = Depends(get_db)
):
    """Calculate salary for an employee"""
    try:
        calculation = await business_service.calculate_salary(
            employee_ca=salary_request.get("employeeCA", 0),
            hours_worked=salary_request.get("hoursWorked", 40),
            guild_id=salary_request.get("guildId", ""),
            entreprise=salary_request.get("entreprise", ""),
            grade=salary_request.get("grade")
        )
        
        return calculation
    except Exception as e:
        logger.error(f"Error calculating salary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

# Event handlers
@app.on_event("startup")
async def startup_event():
    await init_database()
    logger.info("Flashback Enterprise API started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    await close_database()
    logger.info("Flashback Enterprise API shutdown complete")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)