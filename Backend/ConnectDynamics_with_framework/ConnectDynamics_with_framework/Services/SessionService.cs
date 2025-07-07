using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Models.Responses;
using ConnectDynamics_with_framework.Services.Interfaces;
using Microsoft.Xrm.Sdk.Query;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Services
{
    public class SessionService : ISessionService
    {
        private readonly CrmServiceProvider _crmServiceProvider;
        private readonly IDatabase _redisDatabase;
        private readonly ConnectionMultiplexer _redis;
        private readonly string _redisConnectionString;

        public SessionService(CrmServiceProvider crmServiceProvider)
        {
            _redisConnectionString = ConfigurationManager.AppSettings["RedisConnection"];
            _redis = ConnectionMultiplexer.Connect(_redisConnectionString);
            _redisDatabase = _redis.GetDatabase();
            _crmServiceProvider = crmServiceProvider;
        }

        public ActiveSessionsResponse GetActiveSessions()
        {
            var response = new ActiveSessionsResponse();

            try
            {
                if (_redisDatabase == null)
                {
                    response.Success = false;
                    response.ErrorMessage = "La connexion à Redis n'est pas disponible.";
                    response.Sessions = new List<ActiveSession>();
                    return response;
                }

                var server = _redis.GetServer(_redisConnectionString);
                var sessionKeys = server.Keys(pattern: "sessions:*");

                var activeSessions = sessionKeys
                    .Select(key => new ActiveSession
                    {
                        SessionKey = key.ToString(),
                        UserEmail = _redisDatabase.StringGet(key)
                    })
                    .ToList();

                response.Success = true;
                response.Sessions = activeSessions;
                return response;
            }
            catch 
            {
                response.Success = false;
                response.ErrorMessage = "Une erreur s'est produite lors de la récupération des sessions actives.";
                response.Sessions = new List<ActiveSession>();
                return response;
            }
        }

        public VerifySessionResponse VerifySession()
        {
            var request = HttpContext.Current.Request;
            var userIdStr = request.Headers["Authorization"] ?? request.ServerVariables["HTTP_AUTHORIZATION"];
            var response = new VerifySessionResponse();

            if (string.IsNullOrEmpty(userIdStr))
            {
                response.IsValid = false;
                response.Message = "Authorization header missing";
                return response;
            }

            if (!Guid.TryParse(userIdStr, out Guid userGuid))
            {
                response.IsValid = false;
                response.Message = "Invalid user ID format";
                return response;
            }

            string sessionKey = $"sessions:{userIdStr}";

            if (!_redisDatabase.KeyExists(sessionKey))
            {
                response.IsValid = false;
                response.Message = "Session expired or invalid";
                return response;
            }

            bool isAdmin = false;
            using (var service = _crmServiceProvider.GetService()) // remplacez par votre méthode d'accès CRM
            {
                if (service != null && service.IsReady)
                {
                    var user = service.Retrieve("systemuser", userGuid, new ColumnSet("cr9bc_isadmin"));
                    if (user != null)
                    {
                        isAdmin = user.GetAttributeValue<bool>("cr9bc_isadmin");
                    }
                }
            }

            _redisDatabase.KeyExpire(sessionKey, TimeSpan.FromHours(1));

            response.IsValid = true;
            response.IsAdmin = isAdmin;
            response.Message = "Valid session";
            return response;
        }


    }
    }