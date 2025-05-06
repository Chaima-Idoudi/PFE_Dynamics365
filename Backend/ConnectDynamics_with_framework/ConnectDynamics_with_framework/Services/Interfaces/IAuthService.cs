using ConnectDynamics_with_framework.Models;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Models.Responses;

namespace ConnectDynamics_with_framework.Interfaces
{
    public interface IAuthService
    {
        AuthResponse Authenticate(AuthRequest request);
        LogoutResponse Logout();
        EmployeeDto GetAuthenticatedUserDetails();
    }
}