function PageHeader({ title, subtitle }) {
    return (
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">
                {title}
            </h1>

            <p className="text-slate-400 mt-2">
                {subtitle}
            </p>
        </div>
    );
}

export default PageHeader;