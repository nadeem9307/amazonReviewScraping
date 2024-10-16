const puppeteer = require('puppeteer');
const cheerio = require("cheerio");
const fs = require('fs');  // File system module to save JSON

const PRODUCT_URL = 'https://www.amazon.com/JBL-Quantum-300-Over-Ear-Headphones/dp/B084D5QDXN/ref=sr_1_1?_encoding=UTF8&content-id=amzn1.sym.12129333-2117-4490-9c17-6d31baf0582a&dib=eyJ2IjoiMSJ9.7ZDRW6ea-i46iwd279FU_CpmcGNBhQxULfjaHbYVNmciIZ8jkknwxwXaoh4UfHKugj_vLkEiUB5V4WXfiVwQ2KvobN6qXP71t3tCGlbsWQ2uRuGaQj1PYpAo4JWyemN_3xGxlhkt0S8QyZYimdUY39W3LBHnLsI9ADf9yNX6cWAoJFWytJXe4sH4QGmrW3pIejzJ_mTO_VIeuDVb100GpUiEkSVMu9VX-E6Uoxa9uUo.0iAofFwwP_jOmRTHCUQQGIgw0nygN9j_N0AuUVYQ728&dib_tag=se&keywords=gaming%2Bheadsets&pd_rd_r=c4f24cd7-1100-4831-91da-9907c04933cb&pd_rd_w=2MyOy&pd_rd_wg=qGhiC&pf_rd_p=12129333-2117-4490-9c17-6d31baf0582a&pf_rd_r=V8KDR9Z7TZZBDC7ZGP6G&qid=1729063172&sr=8-1&th=1';  // Example product URL

const scrapeAllReviews = async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(PRODUCT_URL);

    // Extract the "See all reviews" link from the product page
    const html = await page.content();
    let $ = cheerio.load(html);

    const allReviewsLink = $('a[data-hook="see-all-reviews-link-foot"]').attr('href');
    const reviewsPageUrl = allReviewsLink ? `https://www.amazon.com${allReviewsLink}` : null;

    if (!reviewsPageUrl) {
        console.log('Could not find the "See all reviews" link.');
        await browser.close();
        return;
    }

    console.log(`Navigating to all reviews page: ${reviewsPageUrl}`);

    let allReviews = [];
    let nextPageUrl = reviewsPageUrl;
    let pageNum = 1;

    // Loop through the paginated reviews
    while (nextPageUrl) {
        console.log(`Scraping page ${pageNum}...`);
        await page.goto(nextPageUrl);
        const reviewsHtml = await page.content();
        $ = cheerio.load(reviewsHtml);

        // Scrape detailed reviews on the current page
        $('.review').each((i, el) => {
            const author = $(el).find('.a-profile-name').text().trim();
            const rating = $(el).find('.a-icon-alt').text().trim();
            const title = $(el).find('a[data-hook="review-title"]').text().trim();
            const content = $(el).find('span[data-hook="review-body"]').text().trim();
            const date = $(el).find('span[data-hook="review-date"]').text().trim();
            const verified = $(el).find('span[data-hook="avp-badge"]').text().trim();
            const imageUrl = $(el).find('img[data-hook="review-image-tile"]').attr('src') || null;

            if (author && rating && title && content) {
                allReviews.push({
                    author,
                    rating,
                    title,
                    content,
                    date,
                    verified: verified || "Not Verified",
                    image_url: imageUrl
                });
            }
        });

        // Check if there is a next page and get its URL
        const nextPageElement = $('li.a-last a');
        nextPageUrl = nextPageElement.length ? `https://www.amazon.com${nextPageElement.attr('href')}` : null;

        pageNum++;
    }

    console.log(`Scraped ${allReviews.length} reviews.`);
    await browser.close();

    // Write the detailed reviews into a JSON file
    fs.writeFileSync('reviews.json', JSON.stringify(allReviews, null, 2), 'utf-8');
    console.log('Detailed reviews saved to reviews.json');

    return allReviews;
};

scrapeAllReviews().then(reviews => {
    if (reviews) {
        reviews.forEach((review, index) => {
            console.log(`Review ${index + 1}:`, review);
        });
    }
});
