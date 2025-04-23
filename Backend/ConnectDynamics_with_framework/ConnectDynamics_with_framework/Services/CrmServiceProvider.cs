using Microsoft.Xrm.Tooling.Connector;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;

namespace ConnectDynamics_with_framework.Services
{
	public class CrmServiceProvider
	{
        private readonly string _connectionString;

        public CrmServiceProvider()
        {
            _connectionString = ConfigurationManager.ConnectionStrings["Dynamics365"].ConnectionString;
        }

        public CrmServiceClient GetService()
        {
            try
            {
                return new CrmServiceClient(_connectionString);
            }
            catch
            {
                return null;
            }
        }
    }
}
