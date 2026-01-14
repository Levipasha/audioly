export const getCassetteColor = (title: string) => {
    if (!title) return '#2b2b2b';
    const colors = [
        '#2b2b2b', // Black
        '#1a365d', // Blue
        '#1c4532', // Green
        '#742a2a', // Maroon
        '#744210', // Brown
        '#553c9a', // Purple
        '#2d3748', // Charcoal
        '#2c7a7b', // Teal
        '#975a16', // Bronze
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};
