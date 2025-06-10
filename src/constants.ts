export const CSS_SELECTORS = {
  // Main tweet/post container
  TWEET_CONTAINER: '[data-testid="tweet"]',
  
  // User information
  USER_AVATAR: '[data-testid="Tweet-User-Avatar"]',
  USER_NAME: '[data-testid="User-Name"]',
  
  // Tweet content
  TWEET_TEXT: '[data-testid="tweetText"]',
  
  // Engagement metrics
  REPLY_BUTTON: '[data-testid="reply"]',
  RETWEET_BUTTON: '[data-testid="retweet"]',
  LIKE_BUTTON: '[data-testid="like"]',
  BOOKMARK_BUTTON: '[data-testid="bookmark"]',
  
  // Time/date
  TIME_LINK: 'time[datetime]',
  
  // Avatar image
  AVATAR_IMAGE: 'img[src*="profile_images"]',
  
  // Verified badge
  VERIFIED_ICON: '[data-testid="icon-verified"]'
} as const;

export const CSS_CLASSES = {
  // Common layout classes
  FLEX_ROW: 'css-175oi2r',
  TEXT_PRIMARY: 'css-146c3p1',
  
  // Color indicators
  PRIMARY_TEXT_COLOR: 'rgb(231, 233, 234)',
  SECONDARY_TEXT_COLOR: 'rgb(113, 118, 123)',
  
  // Interactive elements
  CLICKABLE: 'r-1loqt21',
  BUTTON: 'r-1777fci'
} as const;

export const ELEMENT_PATTERNS = {
  // Patterns for finding elements when testids aren't available
  USERNAME_PATTERN: /^@\w+$/,
  TIMESTAMP_PATTERN: /^\w{3}\s\d{1,2}$/,
  ENGAGEMENT_NUMBER_PATTERN: /^\d+(\.\d+)?[KM]?$/,
  
  // URL patterns
  PROFILE_URL_PATTERN: /^\/\w+$/,
  TWEET_URL_PATTERN: /^\/\w+\/status\/\d+$/,
  
  // Avatar URL pattern
  AVATAR_URL_PATTERN: /profile_images\/\d+\/[\w-]+/
} as const;