import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from mysql_database import get_database
from mysql_models import *

logger = logging.getLogger(__name__)

class BusinessService:
    def __init__(self):
        pass  # Database is injected via dependency injection
    
    async def calculate_salary(
        self, 
        employee_ca: float, 
        hours_worked: float, 
        guild_id: str, 
        entreprise: str,
        grade: Optional[str] = None,
        db = None
    ) -> Dict[str, float]:
        """Calculate employee salary based on CA and configuration"""
        
        # Use default calculation for now
        base_salary = employee_ca * 0.05  # 5% default
        prime = 0
        
        # Simple tier-based primes
        if employee_ca >= 50000:
            prime = 1500
        elif employee_ca >= 25000:
            prime = 750
        
        total_salary = base_salary + prime
        
        return {
            "salaire_base": base_salary,
            "prime": prime,
            "bonus": 0,
            "salaire_total": total_salary
        }
    
    async def calculate_tax_bracket(
        self, 
        ca_brut: float, 
        guild_id: str, 
        entreprise: str
    ) -> Dict[str, Any]:
        """Calculate tax bracket for given CA"""
        
        # Get tax brackets for the enterprise
        tax_brackets = await self.db.get_tax_brackets(guild_id, entreprise)
        if not tax_brackets:
            # Use default brackets
            brackets = [
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
        else:
            brackets = tax_brackets.brackets
        
        # Find applicable bracket
        applicable_bracket = None
        for bracket in brackets:
            if bracket.min <= ca_brut <= bracket.max:
                applicable_bracket = bracket
                break
        
        if not applicable_bracket:
            # Use the highest bracket if CA exceeds all ranges
            applicable_bracket = max(brackets, key=lambda b: b.max)
        
        tax_amount = ca_brut * (applicable_bracket.taux / 100)
        
        return {
            "ca_brut": ca_brut,
            "taux_imposition": applicable_bracket.taux,
            "montant_impots": tax_amount,
            "bracket": applicable_bracket.dict()
        }
    
    async def calculate_dashboard_summary(
        self, 
        guild_id: str, 
        entreprise: str
    ) -> DashboardSummary:
        """Calculate dashboard summary for an enterprise"""
        
        # Get dotation data to calculate CA
        dotation_data = await self.db.get_dotation_data(guild_id, entreprise)
        
        ca_brut = 0
        employee_count = 0
        
        if dotation_data:
            ca_brut = sum(row.ca_total for row in dotation_data.rows)
            employee_count = len(dotation_data.rows)
        
        # Calculate basic expenses (this could be enhanced with real data)
        depenses = ca_brut * 0.25  # Assume 25% expenses
        depenses_deductibles = depenses * 0.8  # 80% deductible
        
        # Calculate net revenue
        benefice = ca_brut - depenses_deductibles
        
        # Calculate taxes
        tax_info = await self.calculate_tax_bracket(benefice, guild_id, entreprise)
        
        summary = DashboardSummary(
            guild_id=guild_id,
            entreprise=entreprise,
            ca_brut=ca_brut,
            depenses=depenses,
            depenses_deductibles=depenses_deductibles,
            benefice=benefice,
            taux_imposition=tax_info["taux_imposition"],
            montant_impots=tax_info["montant_impots"],
            employee_count=employee_count
        )
        
        # Save to database
        await self.db.upsert_dashboard_summary(summary)
        
        return summary
    
    async def process_dotation(
        self, 
        guild_id: str, 
        entreprise: str, 
        dotation_rows: List[DotationRow],
        expenses: float = 0,
        withdrawals: float = 0,
        commissions: float = 0,
        inter_invoices: float = 0
    ) -> DotationData:
        """Process dotation data with salary calculations"""
        
        processed_rows = []
        
        for row in dotation_rows:
            # Calculate CA total if not provided
            if row.ca_total == 0:
                row.ca_total = row.run + row.facture + row.vente
            
            # Calculate salary using business logic
            salary_calc = await self.calculate_salary(
                employee_ca=row.ca_total,
                hours_worked=40,  # Default hours, could be enhanced
                guild_id=guild_id,
                entreprise=entreprise
            )
            
            row.salaire = salary_calc["salaire_total"]
            row.prime = salary_calc["prime"]
            
            processed_rows.append(row)
        
        # Calculate current balance (simplified)
        total_ca = sum(row.ca_total for row in processed_rows)
        total_salaries = sum(row.salaire for row in processed_rows)
        total_primes = sum(row.prime for row in processed_rows)
        
        solde_actuel = total_ca - total_salaries - total_primes - expenses - withdrawals - commissions - inter_invoices
        
        dotation_data = DotationData(
            guild_id=guild_id,
            entreprise=entreprise,
            rows=processed_rows,
            solde_actuel=solde_actuel,
            expenses=expenses,
            withdrawals=withdrawals,
            commissions=commissions,
            inter_invoices=inter_invoices
        )
        
        # Save to database
        await self.db.save_dotation_data(dotation_data)
        
        return dotation_data
    
    async def get_employee_count(self, guild_id: str, entreprise: str) -> int:
        """Get employee count for an enterprise"""
        dotation_data = await self.db.get_dotation_data(guild_id, entreprise)
        return len(dotation_data.rows) if dotation_data else 0
    
    async def add_archive_entry(
        self,
        guild_id: str,
        entry_type: str,
        employe: Optional[str] = None,
        entreprise: Optional[str] = None,
        montant: float = 0,
        statut: str = "En attente"
    ) -> ArchiveEntry:
        """Add an entry to the archive system"""
        
        entry = ArchiveEntry(
            guild_id=guild_id,
            date=datetime.utcnow().strftime("%Y-%m-%d"),
            type=entry_type,
            employe=employe,
            entreprise=entreprise,
            montant=montant,
            statut=statut
        )
        
        await self.db.add_archive_entry(entry)
        return entry
    
    async def calculate_wealth_tax(
        self, 
        total_wealth: float, 
        guild_id: str, 
        entreprise: str
    ) -> Dict[str, Any]:
        """Calculate wealth tax based on total wealth"""
        
        tax_brackets = await self.db.get_tax_brackets(guild_id, entreprise)
        wealth_brackets = []
        
        if tax_brackets:
            wealth_brackets = tax_brackets.wealth
        else:
            # Default wealth brackets
            wealth_brackets = [
                Wealth(min=0, max=1000000, taux=1),
                Wealth(min=1000001, max=5000000, taux=2.5),
                Wealth(min=5000001, max=float('inf'), taux=4)
            ]
        
        # Calculate progressive wealth tax
        total_tax = 0
        remaining_wealth = total_wealth
        
        for bracket in wealth_brackets:
            if remaining_wealth <= 0:
                break
            
            taxable_amount = min(remaining_wealth, bracket.max - bracket.min + 1)
            bracket_tax = taxable_amount * (bracket.taux / 100)
            total_tax += bracket_tax
            remaining_wealth -= taxable_amount
        
        return {
            "total_wealth": total_wealth,
            "wealth_tax": total_tax,
            "effective_rate": (total_tax / total_wealth * 100) if total_wealth > 0 else 0
        }

# Global business service instance
business_service = BusinessService()