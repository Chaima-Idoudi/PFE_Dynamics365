import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService } from '../chat.service';
import { AuthService } from '../../login/services/auth.service';
import { Subscription, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AvatarComponent } from '../../Avatar/avatar/avatar.component';
import {faSpinner} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: Date;
  isMe: boolean;
  isRead: boolean;
  status?: 'sending' | 'sent' | 'failed';
}

interface ChatContact {
  userId: string;
  fullName: string;
  photo: string;
  isConnected: boolean;
  unreadCount: number;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent, FontAwesomeModule]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
   icons = {
      spinner: faSpinner
    };
  contacts: ChatContact[] = [];
  selectedContact: ChatContact | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  searchTerm = '';
  unreadCount = 0;
  isTyping = false;
  shouldScrollToBottom = false;
  typingUsers: {[userId: string]: boolean} = {}
  isEmptyConversation = false;

  
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  private subscriptions: Subscription[] = [];
  private typingSubject = new Subject<string>();
  private typingTimeout: any = null;

  constructor(
    private chatService: ChatService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
  console.log('🚀 Initializing Chat Component...');
  this.chatService.initializeConnection();

  this.subscriptions.push(
    this.chatService.message$.subscribe({
      next: msg => this.handleIncomingMessage(msg.fromUserId, msg.message),
      error: err => console.error('❌ Error in message subscription:', err)
    }),
    
    this.chatService.contacts$.subscribe({
      next: contacts => {
        console.log('📋 Contacts loaded:', contacts?.length || 0);
        
        // Obtenir une copie des contacts
        let updatedContacts = [...contacts];
        
        // Ajouter l'utilisateur actuel à la liste d'affichage
        const currentUserId = this.authService.getUserId();
        if (currentUserId) {
          // Vérifier si l'utilisateur actuel est déjà dans la liste
          const selfContactExists = updatedContacts.some(c => c.userId === currentUserId);
          
          if (!selfContactExists) {
            // Trouver les informations de l'utilisateur actuel
            const currentUserName = this.authService.getFullName() || 'Vous';
            
            // Ajouter l'utilisateur actuel à la liste d'affichage (pas à la base de données)
            updatedContacts.push({
              userId: currentUserId,
              fullName: `${currentUserName} (vous)`,
              photo: '',
              isConnected: true,
              unreadCount: 0,
              email: '',
              isTechnician: false,
              isAdmin: false
            });
          } else {
            // Modifier le nom pour ajouter "(vous)"
            updatedContacts = updatedContacts.map(contact => {
              if (contact.userId === currentUserId && !contact.fullName.includes('(vous)')) {
                return {
                  ...contact,
                  fullName: `${contact.fullName} (vous)`
                };
              }
              return contact;
            });
          }
        }
        
        this.contacts = updatedContacts;
      },
      error: err => console.error('❌ Error in contacts subscription:', err)
    }),
    
    this.chatService.unreadCount$.subscribe({
      next: count => {
        console.log('📬 Unread count updated:', count);
        this.unreadCount = count || 0;
      },
      error: err => console.error('❌ Error in unread count subscription:', err)
    })
  );
  
  // Setup typing indicator with debounce
  this.subscriptions.push(
    this.typingSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(message => {
      if (this.selectedContact) {
        const isTyping = message.trim().length > 0;
        this.chatService.sendTypingStatus(this.selectedContact.userId, isTyping);
      }
    })
  );
  
  // Subscribe to typing status updates
  this.subscriptions.push(
    this.chatService.typingStatus$.subscribe({
      next: ({userId, isTyping}) => {
        if (userId) {
          if (isTyping) {
            this.typingUsers[userId] = true;
          } else {
            delete this.typingUsers[userId];
          }
        }
      },
      error: err => console.error('❌ Error in typing status subscription:', err)
    })
  );
}
  
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private handleIncomingMessage(fromUserId: string, message: string): void {
  if (!fromUserId) return;
  console.log('📨 Message received from:', fromUserId, 'Content:', message);

  const currentUserId = this.authService.getUserId();
  const isCurrentChat = this.selectedContact?.userId === fromUserId;
  
  // Vérifier si c'est un message envoyé à soi-même
  const isSelfChat = fromUserId === currentUserId && this.selectedContact?.userId === currentUserId;
  
  // Si c'est un chat avec soi-même et que le message vient de soi-même, ne pas l'ajouter
  // car il a déjà été ajouté lors de l'envoi
  if (isSelfChat) {
    console.log('💬 Message envoyé à soi-même, ignoré pour éviter la duplication');
    return;
  }

  const newMessage: ChatMessage = {
    id: Date.now().toString(),
    fromUserId,
    toUserId: this.authService.getUserId() || '',
    message,
    timestamp: new Date(),
    isMe: false,
    isRead: isCurrentChat
  };

  // Check if the message doesn't already exist
  const messageExists = this.messages.some(m => 
    m.fromUserId === newMessage.fromUserId && 
    m.message === newMessage.message && 
    Math.abs(m.timestamp.getTime() - newMessage.timestamp.getTime()) < 1000
  );

  if (!messageExists) {
    this.messages = [...this.messages, newMessage];
    console.log('💬 Messages updated, total count:', this.messages.length);
    this.shouldScrollToBottom = true;

    if (isCurrentChat) {
      this.markMessagesAsRead([newMessage.id]);
    } else {
      this.updateContactUnreadCount(fromUserId);
    }
  }
}

  selectContact(contact: ChatContact): void {
    if (!contact?.userId) return;

    console.log('👤 Selecting contact:', contact.fullName);
    this.selectedContact = contact;
    this.loadChatHistory();
    this.resetContactUnreadCount(contact.userId);
  }

  private resetContactUnreadCount(userId: string): void {
    const contact = this.contacts.find(c => c.userId === userId);
    if (contact) {
      contact.unreadCount = 0;
    }
  }

  loadChatHistory(): void {
  if (!this.selectedContact) return;

  const currentUserId = this.authService.getUserId();
  if (!currentUserId) return;

  console.log('📚 Loading chat history for:', this.selectedContact.fullName);
  this.isLoading = true;
  this.messages = [];
  
  this.chatService.getChatHistory(currentUserId, this.selectedContact.userId)
    .subscribe({
      next: (messages) => {
        console.log('📚 Chat history loaded:', messages.length, 'messages');
        this.isEmptyConversation = messages.length === 0;
        
        // Pour le chat avec soi-même, s'assurer que tous les messages sont marqués comme "isMe"
        if (this.selectedContact?.userId === currentUserId) {
          this.messages = messages.map(msg => ({
            ...msg,
            isMe: true,
            isRead: true
          }));
        } else {
          this.messages = messages.map(msg => ({
            ...msg,
            isMe: msg.fromUserId === currentUserId,
            isRead: msg.fromUserId === currentUserId ? true : msg.isRead
          }));
        }
        
        this.isLoading = false;
        this.shouldScrollToBottom = true;
        
        const unreadIds = this.messages
          .filter(msg => !msg.isMe && !msg.isRead)
          .map(msg => msg.id);
        
        if (unreadIds.length > 0) {
          console.log('📬 Marking', unreadIds.length, 'messages as read');
          this.markMessagesAsRead(unreadIds);
        }
      },
      error: (err) => {
        console.error('❌ Error loading chat history', err);
        this.isLoading = false;
        this.isEmptyConversation = true;
      }
    });
}

  async sendMessage(): Promise<void> {
  if (!this.newMessage.trim() || !this.selectedContact) return;

  const currentUserId = this.authService.getUserId();
  if (!currentUserId) return;

  const tempId = 'temp-' + Date.now().toString();
  const messageText = this.newMessage.trim();
  
  console.log('📤 Sending message:', messageText.substring(0, 50) + '...');
  
  // Clear the input immediately for better UX
  this.newMessage = '';

  // Clear typing status when sending a message
  if (this.selectedContact) {
    this.chatService.sendTypingStatus(this.selectedContact.userId, false);
  }
  
  // Add temporary message to UI
  const tempMessage: ChatMessage = {
    id: tempId,
    fromUserId: currentUserId,
    toUserId: this.selectedContact.userId,
    message: messageText,
    timestamp: new Date(),
    isMe: true,
    isRead: false,
    status: 'sending'
  };
  
  this.messages = [...this.messages, tempMessage];
  this.shouldScrollToBottom = true;
  
  try {
    const success = await this.chatService.sendMessage(this.selectedContact.userId, messageText);
    
    if (success) {
      console.log('✅ Message sent successfully');
      const messageIndex = this.messages.findIndex(m => m.id === tempId);
      if (messageIndex >= 0) {
        this.messages[messageIndex].status = 'sent';
        
        // Si c'est un chat avec soi-même, marquer le message comme lu immédiatement
        if (this.selectedContact.userId === currentUserId) {
          this.messages[messageIndex].isRead = true;
        }
        
        this.messages = [...this.messages];
      }
    } else {
      throw new Error('Failed to send message: Server returned false');
    }
  } catch (err) {
    console.error('❌ Exception while sending message:', err);
    
    const messageIndex = this.messages.findIndex(m => m.id === tempId);
    if (messageIndex >= 0) {
      this.messages[messageIndex].status = 'failed';
      this.messages = [...this.messages];
    }
    
    // Show error to user
    alert('Failed to send message. Please try again.');
  }
}

  retryMessage(messageId: string): void {
    const failedMessage = this.messages.find(m => m.id === messageId && m.status === 'failed');
    if (!failedMessage || !this.selectedContact) return;
    
    // Update status to sending
    const messageIndex = this.messages.findIndex(m => m.id === messageId);
    this.messages[messageIndex].status = 'sending';
    this.messages = [...this.messages];
    
    // Retry sending
    this.chatService.sendMessage(failedMessage.toUserId, failedMessage.message)
      .then(success => {
        if (success) {
          this.messages[messageIndex].status = 'sent';
        } else {
          this.messages[messageIndex].status = 'failed';
        }
        this.messages = [...this.messages];
      })
      .catch(() => {
        this.messages[messageIndex].status = 'failed';
        this.messages = [...this.messages];
      });
  }

  markMessagesAsRead(messageIds: string[]): void {
    if (!messageIds.length) return;

    console.log('📖 Marking messages as read:', messageIds.length);
    this.chatService.markMessagesAsRead(messageIds)
      .subscribe({
        next: () => {
          this.messages.forEach(msg => {
            if (messageIds.includes(msg.id)) {
              msg.isRead = true;
            }
          });
        },
        error: (err) => console.error('❌ Error marking messages as read', err)
      });
  }

  updateContactUnreadCount(userId: string): void {
    const contact = this.contacts.find(c => c.userId === userId);
    if (contact) {
      contact.unreadCount = (contact.unreadCount || 0) + 1;
    }
  }

  get filteredContacts(): ChatContact[] {
  let filtered = this.contacts;
  
  if (this.searchTerm) {
    filtered = this.contacts.filter(contact => 
      contact?.fullName?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
  
  // Sort to ensure current user is always at the top
  return filtered.sort((a, b) => {
    const currentUserId = this.authService.getUserId();
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });
}
  
  onTyping(): void {
    this.typingSubject.next(this.newMessage);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    if (!this.isTyping && this.newMessage.trim()) {
      this.isTyping = true;
      // Here you would send typing indicator to server if implemented
    }
    
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      // Here you would send stopped typing indicator to server if implemented
    }, 1000);
  }
  get isSelectedContactTyping(): boolean {
    return this.selectedContact ? !!this.typingUsers[this.selectedContact.userId] : false;
  }

  
  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom', err);
    }
  }

  ngOnDestroy(): void {
    console.log('🔌 Destroying Chat Component...');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.chatService.disconnect();
  }
}
