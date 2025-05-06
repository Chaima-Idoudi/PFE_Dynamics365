using ConnectDynamics_with_framework.Models.DTOs;

namespace ConnectDynamics_with_framework.Models.Responses
{
    public class ProfileResponse
    {
        public bool Success { get; set; }
        public EmployeeDto Profile { get; set; }
        public string ErrorMessage { get; set; }
    }
}