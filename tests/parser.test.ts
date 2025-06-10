import { CommentParser } from '../src/parser';
import { TWEET_HTML_EXAMPLES } from './fixtures';

describe('CommentParser', () => {
  let parser: CommentParser;

  beforeEach(() => {
    parser = new CommentParser();
  });

  function createTweetElement(html: string): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = html;
    const tweetElement = container.querySelector('[data-testid="tweet"]') as HTMLElement;
    if (!tweetElement) {
      throw new Error('Tweet element not found in HTML');
    }
    return tweetElement;
  }

  describe('parseComment', () => {
    it('should parse a basic tweet correctly', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.author.username).toBe('piercefreeman');
        expect(result.author.displayName).toBe('Pierce Freeman');
        expect(result.author.verified).toBe(true);
        expect(result.content.text).toBe('But can you encode it in an mp4');
        expect(result.engagement.replies).toBe(3);
        expect(result.engagement.likes).toBe(25);
        expect(result.engagement.views).toBe(3400);
      }
    });

    it('should parse the second tweet example correctly', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.secondTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.author.username).toBe('piercefreeman');
        expect(result.author.displayName).toBe('Pierce Freeman');
        expect(result.author.verified).toBe(true);
        expect(result.content.text).toContain('Nope. Nope. This is so wrong.');
        expect(result.engagement.replies).toBe(14);
        expect(result.engagement.retweets).toBe(19);
        expect(result.engagement.likes).toBe(664);
        expect(result.engagement.views).toBe(39000);
      }
    });
  });

  describe('username extraction', () => {
    it('should extract username from @mention text', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.author.username).toBe('piercefreeman');
    });

    it('should extract username from profile links', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.secondTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.author.username).toBe('piercefreeman');
      expect(result?.author.profileUrl).toContain('/piercefreeman');
    });
  });

  describe('engagement metrics parsing', () => {
    it('should parse engagement numbers correctly', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.engagement.replies).toBe(3);
        expect(result.engagement.retweets).toBe(0); // "0 reposts" in the HTML
        expect(result.engagement.likes).toBe(25);
        expect(result.engagement.views).toBe(3400); // "3.4K" converts to 3400
      }
    });

    it('should handle K and M suffixes in engagement numbers', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.secondTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.engagement.views).toBe(39000); // "39K" converts to 39000
      }
    });
  });

  describe('avatar and verification', () => {
    it('should detect verified accounts', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.author.verified).toBe(true);
    });

    it('should extract avatar URL', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.author.avatarUrl).toContain('profile_images');
      expect(result?.author.avatarUrl).toContain('EJx_LgHM_x96.jpg');
    });
  });

  describe('content parsing', () => {
    it('should extract tweet text correctly', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.content.text).toBe('But can you encode it in an mp4');
    });

    it('should extract multiline tweet text', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.secondTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.content.text).toContain('Nope. Nope. This is so wrong.');
      expect(result?.content.text).toContain('FAISS is still a vector db');
    });

    it('should extract timestamp', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.content.timestamp).toBe('2025-06-08T03:04:53.000Z');
    });

    it('should extract tweet URL', () => {
      const tweetElement = createTweetElement(TWEET_HTML_EXAMPLES.originalTweet);
      const result = parser.parseComment(tweetElement);

      expect(result).not.toBeNull();
      expect(result?.content.url).toContain('/piercefreeman/status/1931547956399968459');
    });
  });

  describe('generateJSON', () => {
    it('should generate valid JSON structure', () => {
      // Mock document.querySelectorAll to return our test elements
      const originalQuerySelectorAll = document.querySelectorAll;
      const mockElements = [
        createTweetElement(TWEET_HTML_EXAMPLES.originalTweet),
        createTweetElement(TWEET_HTML_EXAMPLES.secondTweet)
      ];
      document.querySelectorAll = () => mockElements as any;

      const json = parser.generateJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('count');
      expect(parsed).toHaveProperty('comments');
      expect(Array.isArray(parsed.comments)).toBe(true);
      expect(parsed.count).toBe(2);

      // Restore original method
      document.querySelectorAll = originalQuerySelectorAll;
    });
  });

  describe('edge cases', () => {
    it('should handle missing elements gracefully', () => {
      const emptyTweet = document.createElement('article');
      emptyTweet.setAttribute('data-testid', 'tweet');
      
      const result = parser.parseComment(emptyTweet);
      
      // Should return null for empty/invalid tweets
      expect(result).toBeNull();
    });

    it('should handle tweets with no engagement numbers', () => {
      const minimalTweet = `
        <article data-testid="tweet">
          <div data-testid="User-Name">
            <span>Test User</span>
            <span>@testuser</span>
          </div>
          <div data-testid="tweetText">Test tweet content</div>
          <time datetime="2025-01-01T00:00:00.000Z">Jan 1</time>
        </article>
      `;
      
      const container = document.createElement('div');
      container.innerHTML = minimalTweet;
      const tweetElement = container.querySelector('[data-testid="tweet"]') as HTMLElement;
      
      const result = parser.parseComment(tweetElement);
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result.engagement.replies).toBe(0);
        expect(result.engagement.retweets).toBe(0);
        expect(result.engagement.likes).toBe(0);
      }
    });
  });
});