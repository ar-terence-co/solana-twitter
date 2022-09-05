use anchor_lang::prelude::*;

declare_id!("BUW39Wm8Q3cXfkbQ6aesRKARc3bKxUJL3vHWFMn6ntRz");

#[program]
pub mod solana_twitter {
    use super::*;

    pub fn send_tweet(ctx: Context<SendTweet>, topic: String, content: String, unique_seed: [u8; 16]) -> Result<()> {
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
        tweet.created_timestamp = clock.unix_timestamp;
        tweet.updated_timestamp = tweet.created_timestamp;
        tweet.topic = topic;
        tweet.content = content;
        tweet.unique_seed = unique_seed;
        tweet.bump = *ctx.bumps.get("tweet").unwrap();

        Ok(())
    }

    pub fn update_tweet(ctx: Context<UpdateTweet>, topic: String, content: String) -> Result<()> {
        let tweet: &mut Account<Tweet> = &mut ctx.accounts.tweet;
        let clock: Clock = Clock::get().unwrap();

        if topic.chars().count() > 50 {
            return err!(ErrorCode::TopicTooLong);
        }

        if content.chars().count() > 280 {
            return err!(ErrorCode::ContentTooLong);
        }

        tweet.updated_timestamp = clock.unix_timestamp;
        tweet.topic = topic;
        tweet.content = content;

        Ok(())
    }

    pub fn delete_tweet(_ctx: Context<DeleteTweet>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(topic: String, content: String, unique_seed: [u8; 16])]
pub struct SendTweet<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(init, payer = author, space = Tweet::LEN, seeds = [b"tweet", author.key().as_ref(), unique_seed.as_ref()], bump)]
    pub tweet: Account<'info, Tweet>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTweet<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        mut, 
        seeds = [b"tweet", author.key().as_ref(), tweet.unique_seed.as_ref()], 
        bump = tweet.bump,
    )]
    pub tweet: Account<'info, Tweet>,
}

#[derive(Accounts)]
pub struct DeleteTweet<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        mut,
        close = author,
        seeds = [b"tweet", author.key().as_ref(), tweet.unique_seed.as_ref()], 
        bump = tweet.bump,
    )]
    pub tweet: Account<'info, Tweet>,
}

#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub created_timestamp: i64,
    pub updated_timestamp: i64,
    pub topic: String,
    pub content: String,
    pub unique_seed: [u8; 16],
    pub bump: u8,
}

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBKEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const STRING_PREFIX_LENGTH: usize = 4; // Stores the size of the string
const MAX_TOPIC_LENGTH: usize = 50 * 4; // Max of 50 chars in UTF-8 encoding
const MAX_CONTENT_LENGTH: usize = 280 * 4; // Max of 280 chars in UTF-8 encoding
const UNIQUE_SEED_LENGTH: usize = 16;
const BUMP_LENGTH: usize = 1;

impl Tweet {
    const LEN: usize = DISCRIMINATOR_LENGTH 
        + PUBKEY_LENGTH // Author
        + TIMESTAMP_LENGTH // Created Timestamp
        + TIMESTAMP_LENGTH // Updated Timestamp
        + STRING_PREFIX_LENGTH + MAX_TOPIC_LENGTH // Topic
        + STRING_PREFIX_LENGTH + MAX_CONTENT_LENGTH // Content
        + UNIQUE_SEED_LENGTH
        + BUMP_LENGTH;
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 280 characters long maximum.")]
    ContentTooLong,
}
