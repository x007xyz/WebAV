interface CardProps {
  name: string;
  cover: string;
  description: string;
  link: string;
}

const Card: React.FC<CardProps> = ({ name, cover, description, link }) => {
  return (
    <div className="w-72 rounded-lg shadow-md bg-white dark:bg-slate-700 hover:scale-105 transition-transform duration-300">
      <a href={link} target="_blank" rel="noopener noreferrer">
        <img src={cover} className="w-full h-44 object-cover" />
      </a>
      <div className="h-32 p-4 flex flex-col">
        <p className="text-xl font-semibold dark:text-blue-200">{name}</p>
        <p className="mt-1 text-gray-600 dark:text-white line-clamp-3">
          {description}
        </p>
      </div>
    </div>
  );
};

interface ShowcaseCardsProps {
  data: {
    tips: string;
    list: CardProps[];
  };
}

const ShowcaseCards: React.FC<ShowcaseCardsProps> = ({
  data: { list, tips },
}) => {
  return (
    <>
      <div className="text-center italic">{tips}</div>
      <div className="flex flex-wrap">
        {list?.map((item, index) => (
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
    </>
  );
};

export default ShowcaseCards;
