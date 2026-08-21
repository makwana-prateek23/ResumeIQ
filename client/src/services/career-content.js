const DEV_ARTICLES_URL = 'https://dev.to/api/articles?tag=career&per_page=6';

export async function getCareerArticles(signal) {
  const response = await fetch(DEV_ARTICLES_URL, { signal });
  if (!response.ok) throw new Error('Career articles are unavailable');
  const articles = await response.json();
  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    description: article.description,
    url: article.url,
    image: article.cover_image ?? article.social_image,
    author: article.user?.name ?? 'DEV Community',
    date: article.published_at,
    readingTime: article.reading_time_minutes
  }));
}
