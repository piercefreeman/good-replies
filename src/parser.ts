import { CSS_SELECTORS, ELEMENT_PATTERNS } from './constants';

export interface ParsedComment {
  id: string;
  author: {
    username: string;
    displayName: string;
    verified: boolean;
    avatarUrl?: string;
    profileUrl: string;
  };
  content: {
    text: string;
    timestamp: string;
    url: string;
  };
  engagement: {
    replies: number;
    retweets: number;
    likes: number;
    views?: number;
  };
  element: HTMLElement;
}

export class CommentParser {
  private extractTextContent(element: Element | null): string {
    return element?.textContent?.trim() || '';
  }

  private extractNumber(text: string): number {
    if (!text) return 0;
    
    const match = text.match(/[\d,]+(\.\d+)?[KM]?/);
    if (!match) return 0;
    
    const numStr = match[0].replace(',', '');
    const num = parseFloat(numStr);
    
    if (numStr.includes('K')) return Math.floor(num * 1000);
    if (numStr.includes('M')) return Math.floor(num * 1000000);
    return Math.floor(num);
  }

  private generateCommentId(element: HTMLElement): string {
    const tweetUrl = element.querySelector(`${CSS_SELECTORS.TIME_LINK}`)?.closest('a')?.href;
    if (tweetUrl) {
      const match = tweetUrl.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseUserInfo(tweetElement: HTMLElement): ParsedComment['author'] {
    const userNameElement = tweetElement.querySelector(CSS_SELECTORS.USER_NAME);
    const avatarElement = tweetElement.querySelector(CSS_SELECTORS.AVATAR_IMAGE) as HTMLImageElement;
    const verifiedElement = tweetElement.querySelector(CSS_SELECTORS.VERIFIED_ICON);
    
    let displayName = '';
    let username = '';
    let profileUrl = '';

    if (userNameElement) {
      const nameSpans = userNameElement.querySelectorAll('span');
      for (const span of nameSpans) {
        const text = span.textContent?.trim() || '';
        if (text && !text.startsWith('@') && !displayName) {
          displayName = text;
        }
        // Also look for @username in spans
        if (text.startsWith('@') && !username) {
          username = text.substring(1);
        }
      }
    }

    // Try to find profile link - look for links that go to user profiles
    const profileLinks = tweetElement.querySelectorAll('a[href^="/"]');
    for (const link of profileLinks) {
      const href = (link as HTMLAnchorElement).href;
      
      // Match both full URLs and relative paths
      let match = href.match(/(?:twitter\.com|x\.com)?\/([a-zA-Z0-9_]+)(?:\/status\/\d+)?$/);
      if (!match) {
        // Try relative path pattern
        const pathname = new URL(href).pathname;
        match = pathname.match(/^\/([a-zA-Z0-9_]+)(?:\/.*)?$/);
      }
      
      if (match && match[1] && match[1] !== 'status') {
        // Avoid URLs like /status/, /settings/, etc.
        const potentialUsername = match[1];
        if (!['status', 'settings', 'notifications', 'messages', 'compose', 'search', 'explore', 'home'].includes(potentialUsername)) {
          username = potentialUsername;
          profileUrl = href;
          break;
        }
      }
    }

    return {
      username,
      displayName,
      verified: !!verifiedElement,
      avatarUrl: avatarElement?.src,
      profileUrl
    };
  }

  private parseContent(tweetElement: HTMLElement): ParsedComment['content'] {
    const textElement = tweetElement.querySelector(CSS_SELECTORS.TWEET_TEXT);
    const timeElement = tweetElement.querySelector(CSS_SELECTORS.TIME_LINK) as HTMLTimeElement;
    
    const text = this.extractTextContent(textElement);
    const timestamp = timeElement?.getAttribute('datetime') || '';
    
    let url = '';
    const timeLink = timeElement?.closest('a') as HTMLAnchorElement;
    if (timeLink) {
      url = timeLink.href;
    }

    return { text, timestamp, url };
  }

  private parseEngagement(tweetElement: HTMLElement): ParsedComment['engagement'] {
    const replyButton = tweetElement.querySelector(CSS_SELECTORS.REPLY_BUTTON);
    const retweetButton = tweetElement.querySelector(CSS_SELECTORS.RETWEET_BUTTON);
    const likeButton = tweetElement.querySelector(CSS_SELECTORS.LIKE_BUTTON);
    const viewsLink = tweetElement.querySelector('a[href*="/analytics"]');

    const replies = this.extractNumber(this.extractTextContent(replyButton));
    const retweets = this.extractNumber(this.extractTextContent(retweetButton));
    const likes = this.extractNumber(this.extractTextContent(likeButton));
    const views = viewsLink ? this.extractNumber(this.extractTextContent(viewsLink)) : undefined;

    return { replies, retweets, likes, views };
  }

  public parseComment(element: HTMLElement): ParsedComment | null {
    try {
      const id = this.generateCommentId(element);
      const author = this.parseUserInfo(element);
      const content = this.parseContent(element);
      const engagement = this.parseEngagement(element);

      if (!content.text && !author.username) {
        return null;
      }

      return {
        id,
        author,
        content,
        engagement,
        element
      };
    } catch (error) {
      console.error('Error parsing comment:', error);
      return null;
    }
  }

  public parseAllComments(): ParsedComment[] {
    const tweetElements = document.querySelectorAll(CSS_SELECTORS.TWEET_CONTAINER) as NodeListOf<HTMLElement>;
    const comments: ParsedComment[] = [];

    for (const element of tweetElements) {
      // Skip the original tweet - it's usually the first one and has specific characteristics
      if (this.isOriginalTweet(element)) {
        continue;
      }
      
      const parsed = this.parseComment(element);
      if (parsed) {
        comments.push(parsed);
      }
    }

    return comments;
  }

  private isOriginalTweet(element: HTMLElement): boolean {
    // Check if this is the main tweet by looking for reply indicators
    // Replies typically have connecting lines or reply context
    const cellInnerDiv = element.closest('[data-testid="cellInnerDiv"]');
    if (!cellInnerDiv) return false;
    
    // The original tweet usually doesn't have a reply context above it
    // and is positioned differently in the thread structure
    const hasReplyContext = element.querySelector('[data-testid="reply"]')?.textContent?.includes('Replying to');
    const isFirstTweet = Array.from(document.querySelectorAll(CSS_SELECTORS.TWEET_CONTAINER)).indexOf(element) === 0;
    
    // Check for reply thread indicators
    const hasThreadLine = cellInnerDiv.querySelector('[style*="position: absolute"][style*="width: 2px"]');
    
    // Original tweet characteristics:
    // 1. Usually the first tweet element
    // 2. Doesn't have "Replying to" context
    // 3. May not have thread connecting lines
    return isFirstTweet && !hasReplyContext;
  }

  public generateJSON(): string {
    const comments = this.parseAllComments();
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      count: comments.length,
      comments: comments.map(comment => ({
        id: comment.id,
        author: comment.author,
        content: comment.content,
        engagement: comment.engagement
      }))
    }, null, 2);
  }
}