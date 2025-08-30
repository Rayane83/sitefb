// Service API principal qui remplace les mocks
import { apiGet, apiPost } from './api';

const API_BASE_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || 'https://repo-optimizer-3.preview.emergentagent.com';

export class ApiService {
  
  // Dashboard endpoints
  async getDashboardSummary(guildId: string, entreprise: string) {
    return await apiGet(`${API_BASE_URL}/api/dashboard/summary/${guildId}?entreprise=${encodeURIComponent(entreprise)}`);
  }

  async getEmployeeCount(guildId: string, entreprise: string) {
    return await apiGet(`${API_BASE_URL}/api/dashboard/employee-count/${guildId}?entreprise=${encodeURIComponent(entreprise)}`);
  }

  // Dotation endpoints
  async getDotation(guildId: string, entreprise?: string) {
    const params = entreprise ? `?entreprise=${encodeURIComponent(entreprise)}` : '';
    return await apiGet(`${API_BASE_URL}/api/dotation/${guildId}${params}`);
  }

  async saveDotation(guildId: string, data: any) {
    return await apiPost(`${API_BASE_URL}/api/dotation/${guildId}`, data);
  }

  // Staff Configuration endpoints
  async getStaffConfig(guildId: string) {
    return await apiGet(`${API_BASE_URL}/api/staff/config/${guildId}`);
  }

  async saveStaffConfig(guildId: string, config: any) {
    return await apiPost(`${API_BASE_URL}/api/staff/config/${guildId}`, config);
  }

  // Enterprise endpoints
  async getEntreprises(guildId: string) {
    return await apiGet(`${API_BASE_URL}/api/enterprises/${guildId}`);
  }

  async upsertEntreprise(guildId: string, entreprise: any) {
    return await apiPost(`${API_BASE_URL}/api/enterprises/${guildId}`, entreprise);
  }

  async deleteEntreprise(guildId: string, key: string) {
    return await apiGet(`${API_BASE_URL}/api/enterprises/${guildId}/${key}`, { method: 'DELETE' });
  }

  // Archive endpoints
  async getArchive(guildId: string, entreprise?: string) {
    const params = entreprise ? `?entreprise=${encodeURIComponent(entreprise)}` : '';
    return await apiGet(`${API_BASE_URL}/api/archive/${guildId}${params}`);
  }

  async addArchiveEntry(guildId: string, entry: any) {
    return await apiPost(`${API_BASE_URL}/api/archive/${guildId}`, entry);
  }

  // Tax endpoints
  async getTaxBrackets(guildId: string, entreprise: string) {
    return await apiGet(`${API_BASE_URL}/api/tax/brackets/${guildId}?entreprise=${encodeURIComponent(entreprise)}`);
  }

  async getWealth(guildId: string, entreprise: string) {
    return await apiGet(`${API_BASE_URL}/api/tax/wealth/${guildId}?entreprise=${encodeURIComponent(entreprise)}`);
  }

  // Blanchiment endpoints
  async getBlanchimentState(scope: string) {
    return await apiGet(`${API_BASE_URL}/api/blanchiment/state/${scope}`);
  }

  async saveBlanchimentState(scope: string, enabled: boolean) {
    return await apiPost(`${API_BASE_URL}/api/blanchiment/state/${scope}`, { enabled });
  }

  async saveBlanchimentConfig(scope: string, config: any) {
    return await apiPost(`${API_BASE_URL}/api/blanchiment/state/${scope}`, config);
  }

  async getBlanchimentGlobal(guildId: string) {
    return await apiGet(`${API_BASE_URL}/api/blanchiment/global/${guildId}`);
  }

  async saveBlanchimentGlobal(guildId: string, data: any) {
    return await apiPost(`${API_BASE_URL}/api/blanchiment/global/${guildId}`, data);
  }

  // Document endpoints
  async uploadDocument(guildId: string, formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/api/documents/upload/${guildId}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async getDocuments(guildId: string, entreprise: string) {
    return await apiGet(`${API_BASE_URL}/api/documents/${guildId}?entreprise=${encodeURIComponent(entreprise)}`);
  }

  async downloadDocument(guildId: string, documentId: string) {
    return await apiGet(`${API_BASE_URL}/api/documents/${guildId}/${documentId}/download`);
  }

  // Company Configuration endpoints
  async getCompanyConfig(guildId: string, entrepriseId?: string) {
    const params = entrepriseId ? `?entreprise_id=${encodeURIComponent(entrepriseId)}` : '';
    return await apiGet(`${API_BASE_URL}/api/company/config/${guildId}${params}`);
  }

  async saveCompanyConfig(guildId: string, config: any) {
    return await apiPost(`${API_BASE_URL}/api/company/config/${guildId}`, config);
  }

  // Discord Configuration endpoints
  async getDiscordConfig() {
    return await apiGet(`${API_BASE_URL}/api/discord/config`);
  }

  async saveDiscordConfig(config: any) {
    return await apiPost(`${API_BASE_URL}/api/discord/config`, config);
  }

  // Salary calculation
  async calculateSalary(salaryData: any) {
    return await apiPost(`${API_BASE_URL}/api/salary/calculate`, salaryData);
  }

  // Authentication endpoints
  async getUserByDiscordId(discordId: string) {
    return await apiGet(`${API_BASE_URL}/api/auth/user/${discordId}`);
  }

  async getUserGuildRoles(guildId: string, userId: string) {
    return await apiGet(`${API_BASE_URL}/api/guilds/${guildId}/roles/${userId}`);
  }

  // Health check
  async healthCheck() {
    return await apiGet(`${API_BASE_URL}/api/health`);
  }
}

// Export singleton instance
export const apiService = new ApiService();