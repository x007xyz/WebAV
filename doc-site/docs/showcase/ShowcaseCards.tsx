interface CardProps {
  name: string;
  cover: string;
  description: string;
  link: string;
}

const Card: React.FC<CardProps> = ({ name, cover, description, link }) => {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      <div className="w-72 rounded-lg shadow-md bg-white dark:bg-slate-700 hover:scale-105 transition-transform duration-300">
        <img src={cover} className="w-full h-42 object-cover" />
        <div className="h-32 p-4 flex flex-col">
          <p className="text-xl font-semibold text-blue-600 dark:text-blue-200">
            {name}
          </p>
          <p className="mt-1 text-gray-600 dark:text-white line-clamp-3">
            {description}
          </p>
        </div>
      </div>
    </a>
  );
};

interface ShowcaseCardsProps {
  cases: CardProps[];
}

const ShowcaseCards: React.FC<ShowcaseCardsProps> = ({ cases }) => {
  return (
    <div className="flex flex-wrap">
      {cases?.map((item, index) => (
        <div key={index} className="mx-8 my-6">
          <Card
            name={item.name}
            cover={item.cover}
            description={item.description}
            link={item.link}
          />
        </div>
      ))}
    </div>
  );
};

export default ShowcaseCards;
