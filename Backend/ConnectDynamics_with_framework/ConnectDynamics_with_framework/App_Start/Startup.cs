using Microsoft.AspNet.SignalR;
using Microsoft.Owin;
using Microsoft.Owin.Cors;
using Owin;
using System.Web.Http;

[assembly: OwinStartup(typeof(ConnectDynamics_with_framework.Startup))]
namespace ConnectDynamics_with_framework
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.Map("/signalr", map =>
            {
                map.UseCors(CorsOptions.AllowAll);
                var hubConfiguration = new HubConfiguration
                {
                    EnableDetailedErrors = true,
                    EnableJavaScriptProxies = true
                };
                map.RunSignalR(hubConfiguration);
            });

            //GlobalConfiguration.Configure(WebApiConfig.Register);
        }
    }
}