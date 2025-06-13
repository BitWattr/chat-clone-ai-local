import React from 'react';

/**
 * DonatePage Component
 * Displays information about supporting the project through game purchases and donations.
 * Includes embedded content from itch.io and links to external sites.
 */
function DonatePage() {
    return (
        <div className="donate-page-container">
            <h2>😊Support by Buying my Games! (Pay what you want)🙏</h2>
            <p>Your support helps me keep BitWattr developing more cool projects.</p>

            <div className="game-showcase">
                <h3>Featured Game: Assault Auto</h3>
                {/* Embed for the featured game from itch.io */}
                <div className="game-embed" dangerouslySetInnerHTML={{
                    __html: `<iframe frameborder="0" src="https://itch.io/embed/2801178?border_width=0&amp;bg_color=beb2cc&amp;fg_color=222222&amp;link_color=4a25a3&amp;border_color=a57ae3" width="550" height="165" title="Assault Auto by Project_Unplayed on itch.io">
                                <a href="https://project-unplayed.itch.io/assault-auto-demo">Assault Auto by Project_Unplayed</a>
                             </iframe>`
                }}></div>
            </div>

            <div className="other-games-section">
                <p>Support by Buying other creations?</p>
                {/* Link to the developer's itch.io profile */}
                <a
                    href="https://project-unplayed.itch.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="colorful-button"
                    style={{
                        background: 'linear-gradient(45deg, #f06, #09f)',
                        color: 'white',
                        padding: '10px 20px', // Increased horizontal padding
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        fontSize: '1.1em',
                        display: 'inline-block',
                        marginTop: '15px',
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
                    }}
                    aria-label="See more games by BitWattr (Project_Unplayed on itch.io)"
                >
                    See Games by BitWattr (Project_Unplayed on itch.io)
                </a>
            </div>

            {/* Button to navigate back to the previous page */}
            <button onClick={() => window.history.back()} className="back-to-upload-button" style={{ marginTop: '30px' }}>
                Back to Upload
            </button>
        </div>
    );
}

export default DonatePage;
