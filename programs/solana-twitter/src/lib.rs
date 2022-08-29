use anchor_lang::prelude::*;

declare_id!("BUW39Wm8Q3cXfkbQ6aesRKARc3bKxUJL3vHWFMn6ntRz");

#[program]
pub mod solana_twitter {
    use super::*;

    pub fn send_tweet(ctx: Context<SendTweet>, topic: String, content: String) -> Result<()> {
        let tweet: &mut Account<Tweet> = &mut ctx.accounts.tweet;
        let author: &Signer = &ctx.accounts.author;
        let clock: Clock = Clock::get().unwrap();

        if topic.chars().count() > 50 {
            return err!(ErrorCode::TopicTooLong);
        }

        if content.chars().count() > 280 {
            return err!(ErrorCode::ContentTooLong);
        }

        tweet.author = *author.key;
        tweet.timestamp = clock.unix_timestamp;
        tweet.topic = topic;
        tweet.content = content;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SendTweet<'info> {
    #[account(init, payer = author, space = Tweet::LEN)]
    pub tweet: Account<'info, Tweet>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
}

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBKEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 9;
const STRING_PREFIX_LENGTH: usize = 4; // Stores the size of the string
const MAX_TOPIC_LENGTH: usize = 50 * 4; // Max of 50 chars in UTF-8 encoding
const MAX_CONTENT_LENGTH: usize = 280 * 4; // Max of 280 chars in UTF-8 encoding

impl Tweet {
    const LEN: usize = DISCRIMINATOR_LENGTH 
        + PUBKEY_LENGTH // Author
        + TIMESTAMP_LENGTH // Timestamp
        + STRING_PREFIX_LENGTH + MAX_TOPIC_LENGTH // Topic
        + STRING_PREFIX_LENGTH + MAX_CONTENT_LENGTH; // Content
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 280 characters long maximum.")]
    ContentTooLong,
}
