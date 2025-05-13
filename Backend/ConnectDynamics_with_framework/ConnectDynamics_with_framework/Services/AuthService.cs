using ConnectDynamics_with_framework.Interfaces;
using ConnectDynamics_with_framework.Models;
using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Models.Responses;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;
using StackExchange.Redis;
using System;
using System.Configuration;
using System.Net;
using System.Web;
using System.Web.Http;
using System.Web.Http.Results;

namespace ConnectDynamics_with_framework.Services
{
    public class AuthService : IAuthService
    {
        private readonly CrmServiceProvider _crmServiceProvider; // Pour se connecter à Dynamics 365
        private readonly IDatabase _redisDatabase;  // IDatabase: Interface de StackExchange.Redis pour interagir avec Redis


        public AuthService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
        }
        public AuthResponse Authenticate(AuthRequest request)
        {
            // Vérifie que l'email et le mot de passe sont fournis
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                throw new ArgumentException("L'email et le mot de passe sont requis.");
            }
            // Obtient une connexion à Dynamics 365
            using (var service = _crmServiceProvider.GetService())
            {
                // Vérifie que la connexion est active
                if (service == null || !service.IsReady)
                {
                    throw new Exception("La connexion à Dynamics 365 a échoué.");
                }
                // Requête pour trouver l'utilisateur
                var query = new QueryExpression("systemuser")
                {
                    // Sélectionne les champs nécessaires
                    ColumnSet = new ColumnSet("fullname", "domainname", "new_mot_de_passe", "cr9bc_isadmin")
                };
                query.Criteria.AddCondition("domainname", ConditionOperator.Equal, request.Email); // Criteria => WHERE en SQL , WHERE domainname = 'email@exemple.com' ,
                                                                                                   // ConditionOperator.Equal => .Contains , GreaterThan / LessThan , Like , In ...
                // Exécute la requête
                var result = service.RetrieveMultiple(query);
                
                if (result.Entities.Count > 0)
                {
                    //Récupère le premier utilisateur trouvé
                    var user = result.Entities[0];

                    // Vérification du mot de passe , Compare le mot de passe fourni avec celui stocké dans CRM
                    if (user.GetAttributeValue<string>("new_mot_de_passe") == request.Password)
                    {
                        var userId = user.Id.ToString();
                        string sessionKey = $"sessions:{userId}";
                        bool isAdmin = user.Contains("cr9bc_isadmin") && user.GetAttributeValue<bool>("cr9bc_isadmin");
                        string fullName = user.GetAttributeValue<string>("fullname");

                        
                        // Stocker la session dans Redis avec expiration (1h)
                        _redisDatabase.StringSet(sessionKey, request.Email, TimeSpan.FromHours(1));

                        return new AuthResponse
                        {
                            Message = "Authentification réussie",
                            UserId = user.Id,
                            IsAdmin = isAdmin,
                            FullName = fullName
                        };
                    }
                    else
                    {
                        throw new Exception("mauvais mot de passe ");
                    }
                }
                else
                {
                    throw new Exception("email non trouvé ");
                }
            }
        }





        public LogoutResponse Logout()
        {
            try
            {
                var userId = HttpContext.Current.Request.Headers["Authorization"];
                if (string.IsNullOrEmpty(userId))
                {
                    throw new HttpResponseException(HttpStatusCode.Unauthorized);
                }

                string sessionKey = $"sessions:{userId}";

               
                if (!_redisDatabase.KeyExists(sessionKey))
                {
                    throw new HttpResponseException(HttpStatusCode.Unauthorized);
                }

                // Suppression de la session
                _redisDatabase.KeyDelete(sessionKey);

                return new LogoutResponse
                {
                    IsSuccess = true,
                    Message = "Déconnexion réussie"
                };
            }
            catch (Exception ex)
            {
                throw new Exception("Une erreur s'est produite lors de la déconnexion.", ex);
            }
        }

        public EmployeeDto GetAuthenticatedUserDetails()
        {
            var userIdStr = HttpContext.Current.Request.Headers["Authorization"];
            if (string.IsNullOrEmpty(userIdStr) || !_redisDatabase.KeyExists($"sessions:{userIdStr}"))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized);
            }

            if (!Guid.TryParse(userIdStr, out Guid userId))
            {
                throw new HttpResponseException(HttpStatusCode.Unauthorized);
            }

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
                query.Criteria.AddCondition("systemuserid", ConditionOperator.Equal, userId);

                var result = service.RetrieveMultiple(query);
                if (result.Entities.Count == 0)
                {
                    throw new Exception("Utilisateur non trouvé.");
                }

                var user = result.Entities[0];

                return new EmployeeDto
                {
                    FullName = user.GetAttributeValue<string>("fullname"),
                    Email = user.GetAttributeValue<string>("domainname"),
                    UserId = user.Id,
                    IsConnected = true,
                    IsTechnician = user.GetAttributeValue<bool>("new_istechnician"),
                    IsAdmin = user.Contains("cr9bc_isadmin") && user.GetAttributeValue<bool>("cr9bc_isadmin"),
                    Address = user.GetAttributeValue<string>("address1_name"),
                    Country = user.GetAttributeValue<string>("address1_country"),
                    City = user.GetAttributeValue<string>("address1_city"),
                    PostalCode = user.GetAttributeValue<string>("address1_postalcode"),
                    PhoneNumber = user.GetAttributeValue<string>("mobilephone"),
                    Photo = user.GetAttributeValue<string>("photourl"),
                };
            }
        }

    }
}