using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Models.DTOs
{
	public class EmployeeDto
	{
        
        public string FullName { get; set; }
        public string Email { get; set; }
        public Guid UserId { get; set; }
        public bool IsConnected { get; set; }
        public bool IsTechnician { get; set; }
        public bool IsAdmin { get; set; }
        public string Address { get; set; }
        public string Country { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public string PhoneNumber { get; set; }
        public string Photo { get; set; }
        public string Title { get; set; }
        public string BusinessUnit { get; set; }
    }
}