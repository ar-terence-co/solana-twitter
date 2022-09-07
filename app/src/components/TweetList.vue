<script setup>
import { computed, toRefs } from 'vue'
import TweetCard from '@/components/TweetCard'

const props = defineProps({
    tweets: Array,
    loading: Boolean,
})

const { tweets, loading } = toRefs(props)

const orderedTweets = computed(() => {
    return tweets.value.slice().sort((a, b) => b.timestamp - a.timestamp)
})

const replaceTweet = (tweet, otherTweet) => {
    const index = tweets.value.indexOf(tweet)
    tweets.value[index] = otherTweet;
}

const removeTweet = tweet => {
    const index = tweets.value.indexOf(tweet)
    return tweets.value.splice(index, 1)
}
</script>

<template>
    <div v-if="loading" class="p-8 text-gray-500 text-center">
        Loading...
    </div>
    <div v-else class="divide-y">
        <tweet-card v-for="tweet in orderedTweets" @updated="replaceTweet" @deleted="removeTweet" :key="tweet.key" :tweet="tweet"></tweet-card>
    </div>
</template>
