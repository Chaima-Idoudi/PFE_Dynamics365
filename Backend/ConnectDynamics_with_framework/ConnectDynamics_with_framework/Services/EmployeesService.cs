using ConnectDynamics_with_framework.Models.Responses;
using ConnectDynamics_with_framework.Models;
using ConnectDynamics_with_framework.Services.Interfaces;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using ConnectDynamics_with_framework.Models.DTOs;
using System.Net;
using System.Web.Http;
using Microsoft.Xrm.Sdk.Query;

namespace ConnectDynamics_with_framework.Services
{
	public class EmployeesService : IEmployeesService
	{
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;


        public EmployeesService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }

        public List<EmployeeDto> GetEmployees()
        {
            var request = HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];

            if (string.IsNullOrEmpty(userIdStr) || !_redisDatabase.KeyExists($"sessions:{userIdStr}"))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized); // L'utilisateur n'est pas connecté
            }

            if (!Guid.TryParse(userIdStr, out Guid currentUserId))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized); // Identifiant utilisateur invalide
            }

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    var query = new QueryExpression("systemuser")
                    {
                        ColumnSet = new ColumnSet("fullname", "domainname", "new_istechnician", "cr9bc_isadmin", "address1_name", "address1_country", "address1_city", "address1_postalcode", "mobilephone", "photourl")
                    };

                    var users = service.RetrieveMultiple(query);

                    var employeeList = users.Entities
                        .Where(user => user.Id != currentUserId) // Exclure l'utilisateur connecté
                        .Select(user => new EmployeeDto
                        {
                            FullName = user.GetAttributeValue<string>("fullname"),
                            Email = user.GetAttributeValue<string>("domainname"),
                            UserId = user.Id,
                            IsConnected = _redisDatabase.KeyExists($"sessions:{user.Id}"),
                            IsTechnician = user.GetAttributeValue<bool>("new_istechnician"),
                            IsAdmin = user.Contains("cr9bc_isadmin") && user.GetAttributeValue<bool>("cr9bc_isadmin"),
                            Address = user.GetAttributeValue<string>("address1_name"),
                            Country = user.GetAttributeValue<string>("address1_country"),
                            City = user.GetAttributeValue<string>("address1_city"),
                            PostalCode = user.GetAttributeValue<string>("address1_postalcode"),
                            PhoneNumber = user.GetAttributeValue<string>("mobilephone"),
                            Photo = user.GetAttributeValue<string>("photourl"),
                        })
                        .ToList();

                    return employeeList;
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la récupération des utilisateurs.", ex);
            }
        }


    }
}
