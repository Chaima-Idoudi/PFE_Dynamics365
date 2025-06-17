using ConnectDynamics_with_framework.Models.DTOs;
using ConnectDynamics_with_framework.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.Cors;

namespace ConnectDynamics_with_framework.Controllers
{
    [EnableCors(origins: "http://localhost:4200", headers: "*", methods: "*")]
    [RoutePrefix("api/chat")]
    public class ChatController : ApiController
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpPost]
        [Route("messages")]
        public async Task<IHttpActionResult> AddMessage([FromBody] ChatMessageDto messageDto)
        {
            try
            {
                var messageId = await _chatService.AddChatMessage(messageDto);
                return Ok(messageId);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpGet]
        [Route("messages/{userId1}/{userId2}")]
        public async Task<IHttpActionResult> GetMessages(Guid userId1, Guid userId2)
        {
            try
            {
                var messages = await _chatService.GetMessagesBetweenUsers(userId1, userId2);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpPatch]
        [Route("messages/read")]
        public async Task<IHttpActionResult> MarkMessagesAsRead([FromBody] List<Guid> messageIds)
        {
            try
            {
                await _chatService.MarkMessagesAsRead(messageIds);
                return Ok();
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpGet]
        [Route("unread/{userId}")]
        public async Task<IHttpActionResult> GetUnreadMessages(Guid userId)
        {
            try
            {
                var unreadMessages = await _chatService.GetUnreadMessages(userId);
                return Ok(unreadMessages);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        [HttpGet]
        [Route("contacts/{userId}")]
        public async Task<IHttpActionResult> GetChatContacts(Guid userId)
        {
            try
            {
                var contacts = await _chatService.GetChatContacts(userId);
                return Ok(contacts);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }
}