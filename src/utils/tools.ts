import { IMessage, Roles } from '../types'

export const mergeMessages = (messages: IMessage[] | undefined): IMessage[] => {
    const mergedMessages: IMessage[] = [];
    let previousRole: Roles | undefined;
    let previousContent = "";
  
    if(!messages){
        return [];
    }

    for (const message of messages) {
      const { role, content } = message;
  
      if (role === previousRole) {
        previousContent += ` ${content}`;
      } else {
        if (previousRole) {
          mergedMessages.push({ role: previousRole, content: previousContent });
        }
        previousRole = role;
        previousContent = content;
      }
    }
  
    if (previousRole) {
      mergedMessages.push({ role: previousRole, content: previousContent });
    }
  
    return mergedMessages;
  };