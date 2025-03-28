using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.Cors;

namespace ConnectDynamics_with_framework
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // Configuration et services de l'API Web
            var cors = new EnableCorsAttribute("http://localhost:4200", "*", "*");
            config.EnableCors(cors);

            // Itinéraires de l'API Web
            config.MapHttpAttributeRoutes();

            //appel a global handler exception
           


            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );
        }
    }
}
