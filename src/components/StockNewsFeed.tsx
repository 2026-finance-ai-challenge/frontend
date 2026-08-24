import { useState } from "react";
import { Link } from "react-router-dom";

const newsItems = [
  [
    "/assets/news-phone.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "High priority",
    "Foreign selling",
  ],
  [
    "/assets/news-office.png",
    "Regulatory Body Probes Short Selling Practices",
    "Positive",
    "Low priority",
    "Listing",
  ],
  [
    "/assets/news-expo.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "Medium priority",
    "Foreign selling",
  ],
  [
    "/assets/news-dark.png",
    "Regulatory Body Probes Short Selling Practices",
    "Positive",
    "Medium priority",
    "Listing",
  ],
  [
    "/assets/news-phone.png",
    "Semiconductor Exports Surge in April",
    "Negative",
    "High priority",
    "Foreign selling",
  ],
];

export function TrendTag({ type }: { type: string }) {
  const negative = type === "Negative";

  return (
    <span className={negative ? "negative" : "positive"}>
      <img
        src={negative ? "/assets/trend-down.svg" : "/assets/trend-up.svg"}
        alt=""
      />
      {type}
    </span>
  );
}

export function StockNewsFeed() {
  const [filter, setFilter] = useState("All");

  return (
    <>
      <div className="feed-controls">
        <div>
          {["All", "High priority", "Positive", "Negative", "My watchlist"].map(
            (item) => (
              <button
                type="button"
                onClick={() => setFilter(item)}
                className={filter === item ? "active" : ""}
                key={item}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <div className="carousel-controls">
          <button type="button" aria-label="Previous">
            <img src="/assets/carousel-prev.svg" alt="" />
          </button>
          <button type="button" aria-label="Next">
            <img src="/assets/carousel-next.svg" alt="" />
          </button>
        </div>
      </div>
      <div className="news-list">
        {newsItems.map((item, index) => (
          <Link
            to="/news/fy2025-dividend"
            className="news-row"
            key={`${item[1]}-${index}`}
          >
            <img src={item[0]} alt="" />
            <div>
              <div className="tags">
                <TrendTag type={item[2]} />
                <span className={item[3].startsWith("High") ? "priority" : ""}>
                  {item[3]}
                </span>
                <span>{item[4]}</span>
              </div>
              <h2>{item[1]}</h2>
              <p>Yonhap Infomax · Aug 14, 14:20 KST · Auto-translated</p>
              <p>
                Selling pressure came mostly from institutions, while ants
                absorbed much of the supply for a fourth straight day. Trading
                concentrated in the bellwether chip names, while several
                small-cap names with limited free float — what local traders
                call sold-out stocks — swung sharply.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
