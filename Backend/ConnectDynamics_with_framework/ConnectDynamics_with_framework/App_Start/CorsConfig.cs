using System.Web.Http;
using System.Web.Http.Cors;

namespace ConnectDynamics_with_framework.App_Start
{
    public static class CorsConfig
    {
        public static void RegisterCors(HttpConfiguration config)
        {
            var cors = new EnableCorsAttribute(
                origins: "http://localhost:4200",
                headers: "*",
                methods: "*");
            config.EnableCors(cors);
        }
    }
}