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
using log4net;

namespace ConnectDynamics_with_framework.Services
{
    // Classes d'exceptions personnalisées pour une meilleure gestion
    public class InvalidEmailException : Exception
    {
        public InvalidEmailException() : base("email non trouvé") { }
    }

    public class InvalidPasswordException : Exception
    {
        public InvalidPasswordException() : base("mauvais mot de passe") { }
    }

    public class AuthService : IAuthService
    {
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;
        private static readonly ILog log = LogManager.GetLogger(typeof(AuthService));

        public AuthService(CrmServiceProvider crmServiceProvider, IDatabase redisDatabase)
        {
            _crmServiceProvider = crmServiceProvider;
            _redisDatabase = redisDatabase;
            log.Debug("AuthService initialisé");
        }

        public AuthResponse Authenticate(AuthRequest request)
        {
            log.Info($"Tentative d'authentification pour l'utilisateur: {request.Email}");

            try
            {
                using (var service = _crmServiceProvider.GetService())
                {
                    if (service == null || !service.IsReady)
                    {
                        log.Error("La connexion à Dynamics 365 a échoué");
                        throw new Exception("La connexion à Dynamics 365 a échoué.");
                    }

                    var query = new QueryExpression("systemuser")
                    {
                        ColumnSet = new ColumnSet("fullname", "domainname", "new_mot_de_passe", "cr9bc_isadmin")
                    };
                    query.Criteria.AddCondition("domainname", ConditionOperator.Equal, request.Email);

                    log.Debug($"Exécution de la requête pour trouver l'utilisateur: {request.Email}");
                    var result = service.RetrieveMultiple(query);

                    if (result.Entities.Count > 0)
                    {
                        var user = result.Entities[0];
                        log.Debug($"Utilisateur trouvé: {user.GetAttributeValue<string>("fullname")}");

                        if (user.GetAttributeValue<string>("new_mot_de_passe") == request.Password)
                        {
                            var userId = user.Id.ToString();
                            string sessionKey = $"sessions:{userId}";
                            bool isAdmin = user.Contains("cr9bc_isadmin") && user.GetAttributeValue<bool>("cr9bc_isadmin");
                            string fullName = user.GetAttributeValue<string>("fullname");

                            _redisDatabase.StringSet(sessionKey, request.Email, TimeSpan.FromHours(1));

                            log.Info($"Authentification réussie pour: {request.Email}, UserId: {userId}, IsAdmin: {isAdmin}");

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
                            log.Warn($"Mot de passe incorrect pour l'utilisateur: {request.Email}");
                            throw new InvalidPasswordException();
                        }
                    }
                    else
                    {
                        log.Warn($"Utilisateur non trouvé avec l'email: {request.Email}");
                        throw new InvalidEmailException();
                    }
                }
            }
            catch (InvalidEmailException ex)
            {
                log.Warn($"Exception d'email invalide: {ex.Message}");
                throw;
            }
            catch (InvalidPasswordException ex)
            {
                log.Warn($"Exception de mot de passe invalide: {ex.Message}");
                throw;
            }
            catch (Exception ex)
            {
                log.Error($"Erreur inattendue lors de l'authentification pour {request.Email}", ex);
                throw;
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