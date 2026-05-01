import { importChatMessagesFunction } from "./import-chat-messages";
import { processUnipileAccountStatusWebhookFunction } from "./process-unipile-account-status-webhook";
import { processUnipileMessageWebhookFunction } from "./process-unipile-message-webhook";
import { processUnipileUserWebhookFunction } from "./process-unipile-user-webhook";
import { syncLinkedInAccountInitialFunction } from "./sync-linkedin-account-initial";
import { syncLinkedInAccountPartialFunction } from "./sync-linkedin-account-partial";

export const inngestFunctionRegistry = [
  {
    id: "import-chat-messages",
    eventName: "linkedin/chat.import_messages",
    function: importChatMessagesFunction
  },
  {
    id: "process-unipile-account-status-webhook",
    eventName: "unipile/webhook.account_status",
    function: processUnipileAccountStatusWebhookFunction
  },
  {
    id: "process-unipile-message-webhook",
    eventName: "unipile/webhook.messaging",
    function: processUnipileMessageWebhookFunction
  },
  {
    id: "process-unipile-user-webhook",
    eventName: "unipile/webhook.users",
    function: processUnipileUserWebhookFunction
  },
  {
    id: "sync-linkedin-account-initial",
    eventName: "linkedin/account.sync_initial",
    function: syncLinkedInAccountInitialFunction
  },
  {
    id: "sync-linkedin-account-partial",
    eventName: "linkedin/account.sync_partial",
    function: syncLinkedInAccountPartialFunction
  }
];

export const inngestFunctions = inngestFunctionRegistry.map((entry) => entry.function);
export const inngestFunctionIds = inngestFunctionRegistry.map((entry) => entry.id);
export const inngestFunctionEventNames = inngestFunctionRegistry.map((entry) => entry.eventName);
