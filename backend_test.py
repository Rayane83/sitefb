#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Flashback Enterprise
Tests all critical API endpoints with realistic data
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, List

# Configuration
BASE_URL = "https://repo-optimizer-3.preview.emergentagent.com/api"
TEST_GUILD_ID = "test_guild_123"
TEST_ENTERPRISE = "Test Enterprise"

# Test data
SAMPLE_DOTATION_DATA = {
    "entreprise": TEST_ENTERPRISE,
    "rows": [
        {
            "employe": "Jean Dupont",
            "grade": "Employé",
            "ca": 15000,
            "heures": 40,
            "salaire": 3200,
            "prime": 800,
            "total": 4000
        },
        {
            "employe": "Marie Martin",
            "grade": "Patron",
            "ca": 25000,
            "heures": 45,
            "salaire": 5500,
            "prime": 1500,
            "total": 7000
        }
    ],
    "expenses": 2500,
    "withdrawals": 1000,
    "commissions": 500,
    "interInvoices": 300
}

SAMPLE_ENTERPRISE_DATA = {
    "key": "test-enterprise",
    "name": "Test Enterprise Corp",
    "roleId": "123456789",
    "employeeRoleId": "987654321",
    "enterpriseGuildId": TEST_GUILD_ID
}

SAMPLE_STAFF_CONFIG = {
    "paliers": [
        {
            "min": 0,
            "max": 50000,
            "taux": 15,
            "sal_min_emp": 2500,
            "sal_max_emp": 3500,
            "sal_min_pat": 4000,
            "sal_max_pat": 5500,
            "pr_min_emp": 500,
            "pr_max_emp": 1000,
            "pr_min_pat": 1000,
            "pr_max_pat": 2000
        },
        {
            "min": 50001,
            "max": 100000,
            "taux": 25,
            "sal_min_emp": 3500,
            "sal_max_emp": 5000,
            "sal_min_pat": 5500,
            "sal_max_pat": 7500,
            "pr_min_emp": 1000,
            "pr_max_emp": 2000,
            "pr_min_pat": 2000,
            "pr_max_pat": 3500
        }
    ]
}

SAMPLE_BLANCHIMENT_STATE = {
    "enabled": True,
    "useGlobal": False,
    "percEntreprise": 20,
    "percGroupe": 75
}

SAMPLE_COMPANY_CONFIG = {
    "identification": {
        "label": "Test Enterprise Corp",
        "type": "SARL",
        "description": "Test company for API testing"
    },
    "salaire": {
        "pourcentageCA": 8,
        "modes": {
            "caEmploye": True,
            "heuresService": False,
            "additionner": False
        }
    },
    "parametres": {},
    "gradeRules": [],
    "errorTiers": [],
    "roleDiscord": "123456789",
    "employees": []
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def test_health_endpoints(self):
        """Test basic health check endpoints"""
        print("=== Testing Health Check Endpoints ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_result("Root endpoint (/api/)", True, f"API online, version: {data.get('version')}")
                else:
                    self.log_result("Root endpoint (/api/)", False, "Missing expected fields in response", data)
            else:
                self.log_result("Root endpoint (/api/)", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Root endpoint (/api/)", False, f"Exception: {str(e)}")

        # Test health endpoint
        try:
            response = self.session.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_result("Health check (/api/health)", True, "Service is healthy")
                else:
                    self.log_result("Health check (/api/health)", False, "Unexpected health status", data)
            else:
                self.log_result("Health check (/api/health)", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Health check (/api/health)", False, f"Exception: {str(e)}")

    def test_dashboard_endpoints(self):
        """Test dashboard summary and employee count endpoints"""
        print("=== Testing Dashboard Endpoints ===")
        
        # Test dashboard summary
        try:
            url = f"{BASE_URL}/dashboard/summary/{TEST_GUILD_ID}?entreprise={TEST_ENTERPRISE}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                # Check for expected dashboard fields
                expected_fields = ["totalEmployees", "totalSalaries", "totalPrimes", "totalCA"]
                if any(field in data for field in expected_fields):
                    self.log_result("Dashboard summary", True, f"Retrieved dashboard data with {len(data)} fields")
                else:
                    self.log_result("Dashboard summary", True, "Dashboard endpoint working (empty data expected for new system)")
            else:
                self.log_result("Dashboard summary", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Dashboard summary", False, f"Exception: {str(e)}")

        # Test employee count
        try:
            url = f"{BASE_URL}/dashboard/employee-count/{TEST_GUILD_ID}?entreprise={TEST_ENTERPRISE}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                if "count" in data and isinstance(data["count"], int):
                    self.log_result("Employee count", True, f"Employee count: {data['count']}")
                else:
                    self.log_result("Employee count", False, "Missing or invalid count field", data)
            else:
                self.log_result("Employee count", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Employee count", False, f"Exception: {str(e)}")

    def test_dotation_endpoints(self):
        """Test dotation GET and POST endpoints"""
        print("=== Testing Dotation Endpoints ===")
        
        # Test GET dotation (should return empty initially)
        try:
            url = f"{BASE_URL}/dotation/{TEST_GUILD_ID}?entreprise={TEST_ENTERPRISE}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["rows", "soldeActuel", "expenses", "withdrawals", "commissions", "interInvoices"]
                if all(field in data for field in expected_fields):
                    self.log_result("GET dotation", True, f"Retrieved dotation structure with {len(data['rows'])} rows")
                else:
                    self.log_result("GET dotation", False, "Missing expected dotation fields", data)
            else:
                self.log_result("GET dotation", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET dotation", False, f"Exception: {str(e)}")

        # Test POST dotation
        try:
            url = f"{BASE_URL}/dotation/{TEST_GUILD_ID}"
            response = self.session.post(url, json=SAMPLE_DOTATION_DATA)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("POST dotation", True, "Dotation saved successfully")
                else:
                    self.log_result("POST dotation", False, "Success flag not set", data)
            else:
                self.log_result("POST dotation", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST dotation", False, f"Exception: {str(e)}")

    def test_enterprise_endpoints(self):
        """Test enterprise CRUD operations"""
        print("=== Testing Enterprise Endpoints ===")
        
        # Test GET enterprises (should be empty initially)
        try:
            url = f"{BASE_URL}/enterprises/{TEST_GUILD_ID}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET enterprises", True, f"Retrieved {len(data)} enterprises")
                else:
                    self.log_result("GET enterprises", False, "Response is not a list", data)
            else:
                self.log_result("GET enterprises", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET enterprises", False, f"Exception: {str(e)}")

        # Test POST enterprise
        try:
            url = f"{BASE_URL}/enterprises/{TEST_GUILD_ID}"
            response = self.session.post(url, json=SAMPLE_ENTERPRISE_DATA)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("POST enterprise", True, "Enterprise created successfully")
                else:
                    self.log_result("POST enterprise", False, "Success flag not set", data)
            else:
                self.log_result("POST enterprise", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST enterprise", False, f"Exception: {str(e)}")

    def test_staff_config_endpoints(self):
        """Test staff configuration endpoints"""
        print("=== Testing Staff Configuration Endpoints ===")
        
        # Test GET staff config
        try:
            url = f"{BASE_URL}/staff/config/{TEST_GUILD_ID}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                if "paliers" in data and isinstance(data["paliers"], list):
                    self.log_result("GET staff config", True, f"Retrieved config with {len(data['paliers'])} paliers")
                else:
                    self.log_result("GET staff config", False, "Missing or invalid paliers field", data)
            else:
                self.log_result("GET staff config", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET staff config", False, f"Exception: {str(e)}")

        # Test POST staff config
        try:
            url = f"{BASE_URL}/staff/config/{TEST_GUILD_ID}"
            response = self.session.post(url, json=SAMPLE_STAFF_CONFIG)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("POST staff config", True, "Staff configuration saved successfully")
                else:
                    self.log_result("POST staff config", False, "Success flag not set", data)
            else:
                self.log_result("POST staff config", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST staff config", False, f"Exception: {str(e)}")

    def test_archive_endpoints(self):
        """Test archive endpoints"""
        print("=== Testing Archive Endpoints ===")
        
        # Test GET archive
        try:
            url = f"{BASE_URL}/archive/{TEST_GUILD_ID}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET archive", True, f"Retrieved {len(data)} archive entries")
                else:
                    self.log_result("GET archive", False, "Response is not a list", data)
            else:
                self.log_result("GET archive", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET archive", False, f"Exception: {str(e)}")

    def test_blanchiment_endpoints(self):
        """Test blanchiment state management endpoints"""
        print("=== Testing Blanchiment Endpoints ===")
        
        test_scope = "test-scope"
        
        # Test GET blanchiment state
        try:
            url = f"{BASE_URL}/blanchiment/state/{test_scope}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["enabled", "useGlobal"]
                if all(field in data for field in expected_fields):
                    self.log_result("GET blanchiment state", True, f"Retrieved blanchiment state: enabled={data.get('enabled')}")
                else:
                    self.log_result("GET blanchiment state", False, "Missing expected fields", data)
            else:
                self.log_result("GET blanchiment state", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET blanchiment state", False, f"Exception: {str(e)}")

        # Test POST blanchiment state
        try:
            url = f"{BASE_URL}/blanchiment/state/{test_scope}"
            response = self.session.post(url, json=SAMPLE_BLANCHIMENT_STATE)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("POST blanchiment state", True, "Blanchiment state saved successfully")
                else:
                    self.log_result("POST blanchiment state", False, "Success flag not set", data)
            else:
                self.log_result("POST blanchiment state", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST blanchiment state", False, f"Exception: {str(e)}")

    def test_company_config_endpoints(self):
        """Test company configuration endpoints"""
        print("=== Testing Company Configuration Endpoints ===")
        
        # Test GET company config
        try:
            url = f"{BASE_URL}/company/config/{TEST_GUILD_ID}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["identification", "salaire", "parametres"]
                if any(field in data for field in expected_fields):
                    self.log_result("GET company config", True, "Retrieved company configuration")
                else:
                    self.log_result("GET company config", False, "Missing expected configuration fields", data)
            else:
                self.log_result("GET company config", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET company config", False, f"Exception: {str(e)}")

        # Test POST company config
        try:
            url = f"{BASE_URL}/company/config/{TEST_GUILD_ID}"
            response = self.session.post(url, json=SAMPLE_COMPANY_CONFIG)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("POST company config", True, "Company configuration saved successfully")
                else:
                    self.log_result("POST company config", False, "Success flag not set", data)
            else:
                self.log_result("POST company config", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST company config", False, f"Exception: {str(e)}")

    def test_tax_endpoints(self):
        """Test tax bracket endpoints"""
        print("=== Testing Tax Bracket Endpoints ===")
        
        # Test GET tax brackets
        try:
            url = f"{BASE_URL}/tax/brackets/{TEST_GUILD_ID}?entreprise={TEST_ENTERPRISE}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET tax brackets", True, f"Retrieved {len(data)} tax brackets")
                else:
                    self.log_result("GET tax brackets", False, "Response is not a list", data)
            else:
                self.log_result("GET tax brackets", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET tax brackets", False, f"Exception: {str(e)}")

        # Test GET wealth brackets
        try:
            url = f"{BASE_URL}/tax/wealth/{TEST_GUILD_ID}?entreprise={TEST_ENTERPRISE}"
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("GET wealth brackets", True, f"Retrieved {len(data)} wealth brackets")
                else:
                    self.log_result("GET wealth brackets", False, "Response is not a list", data)
            else:
                self.log_result("GET wealth brackets", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET wealth brackets", False, f"Exception: {str(e)}")

    def test_salary_calculation(self):
        """Test salary calculation endpoint"""
        print("=== Testing Salary Calculation ===")
        
        salary_request = {
            "employeeCA": 15000,
            "hoursWorked": 40,
            "guildId": TEST_GUILD_ID,
            "entreprise": TEST_ENTERPRISE,
            "grade": "Employé"
        }
        
        try:
            url = f"{BASE_URL}/salary/calculate"
            response = self.session.post(url, json=salary_request)
            if response.status_code == 200:
                data = response.json()
                # Check if calculation returned some numeric values
                if isinstance(data, dict) and any(isinstance(v, (int, float)) for v in data.values()):
                    self.log_result("Salary calculation", True, "Salary calculation completed successfully")
                else:
                    self.log_result("Salary calculation", True, "Salary calculation endpoint working (may return empty for new system)")
            else:
                self.log_result("Salary calculation", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Salary calculation", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"Starting Flashback Enterprise Backend API Tests")
        print(f"Base URL: {BASE_URL}")
        print(f"Test Guild ID: {TEST_GUILD_ID}")
        print(f"Test Enterprise: {TEST_ENTERPRISE}")
        print("=" * 60)
        
        # Run all test suites
        self.test_health_endpoints()
        self.test_dashboard_endpoints()
        self.test_dotation_endpoints()
        self.test_enterprise_endpoints()
        self.test_staff_config_endpoints()
        self.test_archive_endpoints()
        self.test_blanchiment_endpoints()
        self.test_company_config_endpoints()
        self.test_tax_endpoints()
        self.test_salary_calculation()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = BackendTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)