use anchor_lang::prelude::*;

declare_id!("BUW39Wm8Q3cXfkbQ6aesRKARc3bKxUJL3vHWFMn6ntRz");

#[program]
pub mod solana_twitter {
    use super::*;

    pub fn send_tweet(ctx: Context<SendTweet>, uuid: [u8; 16], topic: String, content: String) -> Result<()> {
        let tweet: &mut Account<Tweet> = &mut ctx.accounts.tweet;
        let author: &Signer = &ctx.accounts.author;
        let clock: Clock = Clock::get().unwrap();

        if topic.chars().count() > 50 {
            return err!(ErrorCode::TopicTooLong);
        }

        if content.chars().count() > 280 {
            return err!(ErrorCode::ContentTooLong);
        }

        tweet.uuid = uuid;
        tweet.author = *author.key;
        tweet.timestamp = clock.unix_timestamp;
        tweet.topic = topic;
        tweet.content = content;
        tweet.bump = *ctx.bumps.get("tweet").unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(uuid: [u8; 16], topic: String, content: String)]
pub struct SendTweet<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(init, payer = author, space = Tweet::LEN, seeds = [b"tweet", author.key().as_ref(), uuid.as_ref()], bump)]
    pub tweet: Account<'info, Tweet>,
    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// pub struct UpdateTweet<'info> {
//     #[account(mut)]
//     pub tweet: Account<'info, Tweet>,
//     #[account(mut)]
//     pub author: Signer<'info>
// }

#[account]
pub struct Tweet {
    pub uuid: [u8; 16],
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
    pub bump: u8,
}

const DISCRIMINATOR_LENGTH: usize = 8;
const UUID_LENGTH: usize = 16;
const PUBKEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const STRING_PREFIX_LENGTH: usize = 4; // Stores the size of the string
const MAX_TOPIC_LENGTH: usize = 50 * 4; // Max of 50 chars in UTF-8 encoding
const MAX_CONTENT_LENGTH: usize = 280 * 4; // Max of 280 chars in UTF-8 encoding
const BUMP_LENGTH: usize = 1;

impl Tweet {
    const LEN: usize = DISCRIMINATOR_LENGTH 
        + UUID_LENGTH
        + PUBKEY_LENGTH // Author
        + TIMESTAMP_LENGTH // Timestamp
        + STRING_PREFIX_LENGTH + MAX_TOPIC_LENGTH // Topic
        + STRING_PREFIX_LENGTH + MAX_CONTENT_LENGTH // Content
        + BUMP_LENGTH;
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 280 characters long maximum.")]
    ContentTooLong,
}
