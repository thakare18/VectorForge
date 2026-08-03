function Card({ title, value }) {

    return (

        <div className="bg-slate-800 rounded-xl p-5 shadow-lg">

            <h3 className="text-gray-400 text-sm">

                {title}

            </h3>

            <p className="text-3xl font-bold text-cyan-400 mt-2">

                {value}

            </p>

        </div>

    );

}

export default Card;